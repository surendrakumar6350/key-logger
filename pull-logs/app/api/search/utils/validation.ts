import { z } from "zod";

export const searchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.string().regex(/^[0-9]+$/).transform(Number).default("100").transform((val) => Math.min(Math.max(val, 1), 1000)),
  page: z.string().regex(/^[0-9]+$/).transform(Number).default("1").transform((val) => Math.max(val, 1)),
  fromDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).optional(),
  toDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).optional(),
  user: z.string().optional(),
  source: z.enum(["database", "s3", "both"]).optional(),
});

export function validateSearchParams(url: URL) {
  const result = searchSchema.safeParse({
    query: url.searchParams.get("query") ?? "",
    limit: url.searchParams.get("limit") ?? "100",
    page: url.searchParams.get("page") ?? "1",
    fromDate: url.searchParams.get("fromDate") ?? undefined,
    toDate: url.searchParams.get("toDate") ?? undefined,
    user: url.searchParams.get("user") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
  });
  if (!result.success) {
    throw new Error("Invalid query params");
  }
  return result.data;
}
