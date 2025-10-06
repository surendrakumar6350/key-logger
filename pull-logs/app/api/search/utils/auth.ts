import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export class AuthError extends Error {
  constructor(message: string = "Authentication failed") {
    super(message);
    this.name = "AuthError";
  }
}

export async function authenticateRequest(): Promise<void> {
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
