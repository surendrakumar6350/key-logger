import { connectDb } from "@/dbConnection/connect";
import { Log } from "@/dbConnection/Schema/logSchema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { fetchLogsFromS3 } from "@/lib/s3-utils";

export const dynamic = "force-dynamic";

const paginationSchema = z.object({
    page: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .default("1")
        .transform((val) => Math.max(val, 1)), // min 1
    limit: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .default("50")
        .transform((val) => Math.min(Math.max(val, 1), 100)), // min 1, max 100
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});


export async function GET(request: Request): Promise<NextResponse> {
    try {
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get('token');

        if (!tokenCookie?.value) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized",
            }, { status: 401 });
        }
        try {
            const token = tokenCookie.value;
            jwt.verify(token, process.env.JWT_SECRET!);
        } catch (error) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized",
            }, { status: 401 })
        }

        const { searchParams } = new URL(request.url);
        const parsed = paginationSchema.safeParse({
            page: searchParams.get("page") ?? "1",
            limit: searchParams.get("limit") ?? "50",
            date: searchParams.get("date"),
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid query params",
                    errors: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const { page, limit, date } = parsed.data;
        const skip = (page - 1) * limit;

        let logs = [];
        let totalLogs = 0;

        // Get current date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // If date is today or not specified, get logs from MongoDB
        if (!date || date === today) {
            await connectDb();
            // Fetch logs from MongoDB with pagination
            logs = await Log.find()
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Get total count
            totalLogs = await Log.countDocuments();
        } else {
            // Fetch historical logs from S3
            try {
                const s3Logs = await fetchLogsFromS3(date);

                // Apply pagination to S3 logs
                totalLogs = s3Logs.length;
                logs = s3Logs.slice(skip, skip + limit);
            } catch (error) {
                console.error("Error fetching logs from S3:", error);
                return NextResponse.json({
                    success: false,
                    message: "Failed to fetch historical logs",
                    error: error instanceof Error ? error.message : String(error)
                }, { status: 500 });
            }
        }

        const source = !date || date === today ? "database" : "s3";

        return NextResponse.json({
            success: true,
            message: `Logs fetched successfully from ${source}`,
            data: logs,
            source: source,
            date: date || today,
            pagination: {
                total: totalLogs,
                page,
                limit,
                totalPages: Math.ceil(totalLogs / limit),
                hasMore: page * limit < totalLogs,
            }
        }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({
            success: false,
            message: "Server Error"
        }, { status: 500 });
    }
}
