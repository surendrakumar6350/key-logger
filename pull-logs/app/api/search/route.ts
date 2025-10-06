import { connectDb } from "@/dbConnection/connect";
import { Log } from "@/dbConnection/Schema/logSchema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { listS3Objects, searchLogsInS3File } from "@/lib/s3-utils";

export const dynamic = "force-dynamic";

// S3 listing page size (S3 MaxKeys limit is 1000)
const S3_LIST_PAGE_SIZE = Math.min(
  Number(process.env.S3_LIST_PAGE_SIZE || '1000'),
  1000
);

// TYPES
// ===============================

// Search result structure
interface SearchResults {
  databaseResults: any[];
  s3Results: any[];
}

// Authentication error
class AuthError extends Error {
  constructor(message: string = "Authentication failed") {
    super(message);
    this.name = "AuthError";
  }
}

// Search parameters
interface SearchParams {
  query: string;
  limit: number;
  page: number;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  user?: string;
  source?: string; // 'database', 's3', or 'both'
}

// Result counts
interface ResultCounts {
  database: number;
  s3: number;
  total: number;
}

// VALIDATION
// ===============================

// Validate search parameters
const searchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.string().regex(/^\d+$/).transform(Number).default("100").transform((val) => Math.min(Math.max(val, 1), 1000)),
  page: z.string().regex(/^\d+$/).transform(Number).default("1").transform((val) => Math.max(val, 1)),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  user: z.string().optional(),
  source: z.enum(["database", "s3", "both"]).optional(),
});


// AUTHENTICATION
// ===============================

/**
 * Authenticate the request using JWT token
 * @throws {AuthError} If authentication fails
 */
async function authenticateRequest(): Promise<void> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie?.value) {
    throw new AuthError("Unauthorized");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  try {
    jwt.verify(tokenCookie.value, secret);
  } catch (error) {
    throw new AuthError("Unauthorized");
  }
}

// PARAMETER VALIDATION
// ===============================

/**
 * Validate and parse search parameters
 * @param url Request URL containing search parameters
 * @returns Validated search parameters
 */
function validateSearchParams(url: URL): SearchParams {
  const result = searchSchema.safeParse({
    query: url.searchParams.get("query") ?? "",
    limit: url.searchParams.get("limit") ?? "100",
    page: url.searchParams.get("page") ?? "1",
    fromDate: url.searchParams.get("fromDate") ?? undefined,
    toDate: url.searchParams.get("toDate") ?? undefined,
    user: url.searchParams.get("user") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
  });
  if (!result.success) {
    throw new Error("Invalid query params");
  }
  return result.data;
}

// MONGODB OPERATIONS
// ===============================

/**
 * Search for logs in MongoDB
 * @param query The search query
 * @param limit Maximum number of results to return
 * @param skip Number of results to skip for pagination
 * @param month Optional month filter (YYYY-MM)
 * @returns Array of matching logs
 */
async function searchMongoDB(query: string, limit: number, skip: number, fromDate?: string, toDate?: string, user?: string): Promise<any[]> {
  try {
    await connectDb();
    
    // Build search conditions
    const searchCondition: any = {
      $or: [
        { user: { $regex: query, $options: 'i' } },
        { values: { $regex: query, $options: 'i' } },
        { page: { $regex: query, $options: 'i' } },
        { ip: { $regex: query, $options: 'i' } }
      ]
    };
    if (fromDate || toDate) {
      searchCondition.timestamp = {};
      if (fromDate) searchCondition.timestamp.$gte = new Date(fromDate).toISOString();
      if (toDate) searchCondition.timestamp.$lte = new Date(toDate).toISOString();
    }
    if (user) {
      searchCondition.user = { $regex: user, $options: 'i' };
    }
    const results = await Log.find(searchCondition)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return results;
  } catch (error) {
    console.error("MongoDB search error:", error);
    return [];
  }
}

// S3 OPERATIONS
// ===============================

/**
 * Process a single S3 file and search for matching logs
 * @param bucketName S3 bucket name
 * @param fileKey S3 file key
 * @param query Search query
 * @param remainingLimit How many more results we need
 * @returns Array of matching logs from this file
 */
async function processSingleS3File(
  bucketName: string,
  fileKey: string,
  query: string,
  remainingLimit: number,
  fromDate?: string,
  toDate?: string,
  user?: string
): Promise<any[]> {
  // Only process HTML logs for better efficiency
  if (!fileKey.endsWith('.html')) {
    return [];
  }

  try {
    // Extract date from filename (logs/YYYY-MM-DD.html)
    const dateMatch = fileKey.match(/logs\/(\d{4}-\d{2}-\d{2})\.html$/);
    const dateStr = dateMatch ? dateMatch[1] : '';

    // Use memory-efficient search function
    const matchedLogs = await searchLogsInS3File(
      bucketName,
      fileKey,
      query,
      dateStr,
      remainingLimit
    );
    // Filter by date and user
    const filtered = matchedLogs.filter(log => {
      let dateOk = true;
      if (fromDate && log.timestamp < fromDate) dateOk = false;
      if (toDate && log.timestamp > toDate) dateOk = false;
      let userOk = true;
      if (user && log.user && !log.user.toLowerCase().includes(user.toLowerCase())) userOk = false;
      return dateOk && userOk;
    });
    return filtered.map(log => ({ ...log, source: 's3', s3File: fileKey }));
  } catch (fileError: any) {
    // Skip this file if there's an error, but continue with others
    if (fileError.code !== 'NoSuchKey' && fileError.statusCode !== 404) {
      console.error(`Error processing ${fileKey}:`, fileError);
    }
    return [];
  }
}

/**
 * Search for logs in S3 files in batches
 * @param query The search query
 * @param limit Maximum number of results to return
 * @param month Optional month filter (YYYY-MM)
 * @returns Array of matching logs
 */
async function searchS3Files(
  query: string, 
  limit: number,
  fromDate?: string,
  toDate?: string,
  user?: string
): Promise<any[]> {
  try {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('S3_BUCKET_NAME environment variable is not defined');
    }

    const results: any[] = [];
    let isTruncated = true;
    let nextToken: string | undefined = undefined;
    
    // If month is specified, optimize search by filtering prefix
  const prefix = 'logs/';

    // Using pagination to process S3 files in batches to avoid memory overload
    while (isTruncated && results.length < limit) {
      // List S3 objects with pagination
      const { files, isTruncated: isMoreFiles, nextToken: token } =
        await listS3Objects(prefix, S3_LIST_PAGE_SIZE, nextToken);

      if (files.length === 0) {
        break;
      }

      nextToken = token;

      // Sort files by date descending (newest first)
      files.sort((a, b) => {
        const dateA = a.Key?.match(/(\d{4}-\d{2}-\d{2})/)?.[0] || '';
        const dateB = b.Key?.match(/(\d{4}-\d{2}-\d{2})/)?.[0] || '';
        return dateB.localeCompare(dateA);
      });

      // Process each file one by one to avoid loading everything into memory
      for (const file of files) {
        // If we've reached our limit, stop processing more files
        if (results.length >= limit) {
          break;
        }

        if (!file.Key) continue;
        // Only consider HTML logs
        if (!file.Key.endsWith('.html')) continue;
        
        // Month filtering removed; date range is validated after parsing per-file logs

        const fileResults = await processSingleS3File(
          bucketName,
          file.Key,
          query,
          limit - results.length,
          fromDate,
          toDate,
          user
        );
        results.push(...fileResults);
      }

      // Update the pagination status for next batch
      isTruncated = isMoreFiles;
    }

    return results;
  } catch (s3Error) {
    console.error("S3 search error:", s3Error);
    return [];
  }
}

// MONTH-WIDE SEARCH (EXACT PAGINATION)
// ===============================

/**
 * Fetch ALL matching MongoDB logs for a given month and query
 */
async function searchMongoDBAllForMonth(query: string, month: string): Promise<any[]> {
  try {
    await connectDb();

    const [year, monthNumStr] = month.split('-');
    const y = Number(year);
    const m = Number(monthNumStr);
    // Start at first day 00:00:00.000 and end at last ms of the month
    const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - 1); // last ms of the month

    const searchCondition: any = {
      $or: [
        { user: { $regex: query, $options: 'i' } },
        { values: { $regex: query, $options: 'i' } },
        { page: { $regex: query, $options: 'i' } },
        { ip: { $regex: query, $options: 'i' } },
      ],
      timestamp: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      },
    };

    const results = await Log.find(searchCondition)
      .sort({ timestamp: -1 })
      .lean();

    return results;
  } catch (err) {
    console.error('Mongo month-wide search error:', err);
    return [];
  }
}

/**
 * Fetch ALL matching S3 logs for a given month and query
 */
async function searchS3FilesAllForMonth(query: string, month: string): Promise<any[]> {
  try {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) throw new Error('S3_BUCKET_NAME environment variable is not defined');

    const results: any[] = [];
    let isTruncated = true;
    let nextToken: string | undefined = undefined;
    const prefix = `logs/${month}`; // e.g., logs/2025-07

    // Iterate all listed files for that month
    while (isTruncated) {
      const { files, isTruncated: more, nextToken: token } = await listS3Objects(prefix, S3_LIST_PAGE_SIZE, nextToken);
      nextToken = token;
      isTruncated = more;

      if (files.length === 0) continue;

      // Sort desc by date embedded in key
      files.sort((a, b) => {
        const da = a.Key?.match(/(\d{4}-\d{2}-\d{2})/)?.[0] || '';
        const db = b.Key?.match(/(\d{4}-\d{2}-\d{2})/)?.[0] || '';
        return db.localeCompare(da);
      });

      for (const file of files) {
        if (!file.Key) continue;
        if (!file.Key.endsWith('.html')) continue; // process HTML only for structure

        // Double-check file is within requested month
        const dateMatch = file.Key.match(/(\d{4}-\d{2})-\d{2}\.html$/);
        const fileMonth = dateMatch?.[1];
        if (fileMonth !== month) continue;

        // Use a very large limit per file; filtering happens inside
        const perFileLimit = Number.MAX_SAFE_INTEGER;
        const matched = await processSingleS3File(bucketName, file.Key, query, perFileLimit);
        results.push(...matched);
      }
    }

    return results;
  } catch (err) {
    console.error('S3 month-wide search error:', err);
    return [];
  }
}

// RESULT PROCESSING
// ===============================

/**
 * Combine and sort results from multiple sources
 * @param results SearchResults object containing results from different sources
 * @param limit Maximum number of results to return
 * @returns Combined, sorted and limited array of results
 */
function combineAndSortResults(
  results: SearchResults, 
  limit: number
): { finalResults: any[], counts: ResultCounts } {
  // Add source information to database results
  const databaseResults = results.databaseResults.map(log => ({ 
    ...log, 
    source: 'database' 
  }));
  
  // Combine results
  const combinedResults = [...databaseResults, ...results.s3Results];

  // Sort by timestamp desc (most recent first)
  combinedResults.sort((a, b) => {
    // Handle various date formats - use timestamps as strings for sorting
    const timeA = a.timestamp || '';
    const timeB = b.timestamp || '';
    return timeB.localeCompare(timeA);
  });

  // Enforce limit after combining
  const finalResults = combinedResults.slice(0, limit);

  // Calculate counts
  const counts = {
    database: results.databaseResults.length,
    s3: results.s3Results.length,
    total: finalResults.length,
  };

  return { finalResults, counts };
}

// PAGINATION
// ===============================

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Calculate pagination metadata
 */
function getPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// MAIN HANDLER
// ===============================

export async function GET(request: Request): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Step 1: Authenticate the request
    try {
      await authenticateRequest();
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({
          success: false,
          message: error.message,
        }, { status: 401 });
      }
      throw error; // Re-throw unexpected errors
    }

    // Step 2: Validate search parameters
    let params: SearchParams;
    try {
      params = validateSearchParams(new URL(request.url));
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: "Invalid query params",
        errors: error instanceof Error ? error.message : String(error),
      }, { status: 400 });
    }

    const { query, limit, page, fromDate, toDate, user, source } = params;
    const skip = (page - 1) * limit;

    // Fetch from DB and/or S3 based on source
    let dbResults: any[] = [];
    let s3Results: any[] = [];
    if (!source || source === 'both' || source === 'database') {
      dbResults = await searchMongoDB(query, 10000, 0, fromDate, toDate, user); // fetch all, filter later
    }
    if (!source || source === 'both' || source === 's3') {
      s3Results = await searchS3Files(query, 10000, fromDate, toDate, user); // fetch all, filter later
    }
    // Tag sources
    dbResults = dbResults.map((log) => ({ ...log, source: 'database' }));
    s3Results = s3Results.map((log) => ({ ...log, source: 's3' }));
    // Combine and sort
    let combined = [...dbResults, ...s3Results].sort((a, b) => {
      const ta = a.timestamp || '';
      const tb = b.timestamp || '';
      return tb.localeCompare(ta);
    });
    const total = combined.length;
    const pageSlice = combined.slice(skip, skip + limit);
    const pagination = getPaginationMeta(page, limit, total);
    const counts = {
      database: dbResults.length,
      s3: s3Results.length,
      total,
    };
    return NextResponse.json(
      {
        success: true,
        message: 'Search completed successfully',
        query,
        timeMs: Date.now() - startTime,
        data: pageSlice,
        counts,
        pagination,
        filters: { fromDate, toDate, user, source },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Search API error:", error);
    
    // Return error response
    return NextResponse.json({
      success: false,
      message: "Server Error",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}