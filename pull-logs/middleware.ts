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