import { NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "./utils/auth";
import { getPaginationMeta } from "./utils/pagination";
import { validateSearchParams } from "./utils/validation";
import { searchMongoDB } from "./utils/mongo";
import { searchS3Files } from "./utils/s3";
import type { SearchParams } from "./utils/types";

export const dynamic = "force-dynamic";

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