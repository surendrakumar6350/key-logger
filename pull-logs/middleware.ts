import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key';
const secret = new TextEncoder().encode(JWT_SECRET);

async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch (err) {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { method, url, headers } = request;

    const ip =
        headers.get("cf-connecting-ip") || // Cloudflare
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() || // Vercel / proxies
        "unknown";

    const istTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(new Date());

    console.log(`[${istTime}] ${method} ${url} — IP: ${ip}`);


    let authCookie = request.cookies.get('token');
    if (request.nextUrl.pathname.startsWith('/')) {
        const isValid = authCookie && await verifyToken(authCookie.value);
        if (!isValid) {
            return NextResponse.rewrite(new URL('/verify', request.url));
        }
    }

    if (request.nextUrl.pathname.startsWith('/verify')) {
        const isValid = authCookie && await verifyToken(authCookie.value);
        if (isValid) {
            return NextResponse.rewrite(new URL('/', request.url));
        }
    }
}


export const config = {
    matcher: ['/', '/verify'],
}