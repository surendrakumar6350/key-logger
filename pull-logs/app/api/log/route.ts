import { connectDb } from "@/dbConnection/connect";
import { Log } from "@/dbConnection/Schema/logSchema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
    try {
        await connectDb();
        const recentLogs = await Log.find().sort({ _id: -1 }).limit(40).lean();

        return NextResponse.json({
            success: true,
            message: recentLogs
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Server Error"
        }, { status: 500 });
    }
}
