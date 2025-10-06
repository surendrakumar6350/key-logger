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
  month?: string; // Format: YYYY-MM
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
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default("100")
    .transform((val) => Math.min(Math.max(val, 1), 100)), // Fixed limit of 100 per page
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default("1")
    .transform((val) => Math.max(val, 1)), // Min page 1
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .transform((val) => val || undefined),
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
    month: url.searchParams.get("month") ?? undefined,
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
async function searchMongoDB(query: string, limit: number, skip: number, month?: string): Promise<any[]> {
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
    
    // Add month filter if provided
    if (month) {
      // Create timestamp range for the given month
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1); // Month is 0-indexed in JS Date
      const endDate = new Date(year, monthNum, 0); // Last day of month
      
      searchCondition.timestamp = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString()
      };
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
  remainingLimit: number
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

    // Add file metadata to matched logs
    return matchedLogs.map(log => ({
      ...log,
      source: 's3',
      s3File: fileKey
    }));
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
  month?: string
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
    const prefix = month ? `logs/${month}` : 'logs/';

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
        
        // If month is specified, double check the file matches the month
        if (month) {
          const dateMatch = file.Key.match(/(\d{4}-\d{2})-\d{2}\.html$/);
          const fileMonth = dateMatch?.[1];
          if (fileMonth !== month) continue;
        }

        const fileResults = await processSingleS3File(
          bucketName,
          file.Key,
          query,
          limit - results.length
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

    const { query, limit, page, month } = params;
    const skip = (page - 1) * limit; // Calculate skip for pagination
    
    // Step 3: Search in MongoDB (today's logs)
    const databaseResults = await searchMongoDB(query, limit, skip, month);

    // Determine how many more results we need from S3
    const remainingNeeded = Math.max(0, limit - databaseResults.length);
    
    // Step 4: Search in S3 (historical logs) only for the remaining needed
    const s3Results = remainingNeeded > 0
      ? await searchS3Files(query, remainingNeeded, month)
      : [];
    
    // Step 5: Combine and process results
    const { finalResults, counts } = combineAndSortResults(
      { databaseResults, s3Results },
      limit
    );

    // Calculate total results available for pagination
    // For accurate pagination, we'd need to count total results, but
    // since we're dealing with S3 files, we'll estimate based on what we have
    const totalEstimate = counts.total * Math.max(1, page);
    const pagination = getPaginationMeta(page, limit, totalEstimate);

    // Step 6: Return successful response with pagination metadata
    return NextResponse.json({
      success: true,
      message: "Search completed successfully",
      query,
      timeMs: Date.now() - startTime,
      data: finalResults,
      counts,
      pagination,
      filters: {
        month: month || null
      }
    }, { status: 200 });

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