import { connectDb } from "@/dbConnection/connect";
import { Log } from "@/dbConnection/Schema/logSchema";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

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

        const token = tokenCookie.value;
        jwt.verify(token, process.env.JWT_SECRET!);


        await connectDb();
        const recentLogs = await Log.find().sort({ _id: -1 }).limit(50).lean();

        return NextResponse.json({
            success: true,
            message: recentLogs
        }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({
            success: false,
            message: "Server Error"
        }, { status: 500 });
    }
}
