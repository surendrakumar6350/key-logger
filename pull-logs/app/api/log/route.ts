import { connectDb } from "@/dbConnection/connect";
import { Log } from "@/dbConnection/Schema/logSchema";
import { NextResponse } from "next/server";

type LogType = {
    _id: string;
    user: string;
    values: string;
    page: string;
    ip: string;
    timestamp: string;
    date: string;
};

export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<NextResponse> {
    try {
        await connectDb();
        const recentLogs: LogType[] = await Log.find().sort({ timestamp: -1 }).limit(20);

        return NextResponse.json({
            success: true,
            message: recentLogs
        }, { status: 200 })
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: "Server Error"
        })
    }
}