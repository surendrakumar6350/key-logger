import { connectDb } from "@/dbConnection/connect";
import { Log } from "@/dbConnection/Schema/logSchema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { z } from "zod";

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

        await connectDb();
        const { searchParams } = new URL(request.url);
        const parsed = paginationSchema.safeParse({
            page: searchParams.get("page") ?? "1",
            limit: searchParams.get("limit") ?? "50",
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

        const { page, limit } = parsed.data;
        const skip = (page - 1) * limit;

        // Fetch logs with pagination
        const logs = await Log.find()
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count
        const totalLogs = await Log.countDocuments();

        return NextResponse.json({
            success: true,
            message: "Recent logs fetched successfully",
            data: logs,
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
