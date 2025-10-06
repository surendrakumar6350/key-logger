import { listS3Objects, searchLogsInS3File } from "@/lib/s3-utils";

const S3_LIST_PAGE_SIZE = Math.min(
  Number(process.env.S3_LIST_PAGE_SIZE || '1000'),
  1000
);

async function processSingleS3File(
  bucketName: string,
  fileKey: string,
  query: string,
  remainingLimit: number,
  fromDate?: string,
  toDate?: string,
  user?: string
): Promise<any[]> {
  if (!fileKey.endsWith('.html')) return [];

  try {
    const dateMatch = fileKey.match(/logs\/(\d{4}-\d{2}-\d{2})\.html$/);
    const dateStr = dateMatch ? dateMatch[1] : '';

    const matchedLogs = await searchLogsInS3File(
      bucketName,
      fileKey,
      query,
      dateStr,
      remainingLimit
    );

    const filtered = matchedLogs.filter(log => {
      let dateOk = true;
      if (fromDate && log.timestamp < fromDate) dateOk = false;
      if (toDate && log.timestamp > toDate) dateOk = false;
      let userOk = true;
      if (user && log.user && !log.user.toLowerCase().includes(user.toLowerCase())) userOk = false;
      return dateOk && userOk;
    });

    return filtered.map(log => ({ ...log, source: 's3', s3File: fileKey }));
  } catch (fileError: any) {
    if (fileError.code !== 'NoSuchKey' && fileError.statusCode !== 404) {
      console.error(`Error processing ${fileKey}:`, fileError);
    }
    return [];
  }
}

export async function searchS3Files(
  query: string,
  limit: number,
  fromDate?: string,
  toDate?: string,
  user?: string
): Promise<any[]> {
  try {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) throw new Error('S3_BUCKET_NAME environment variable is not defined');

    const results: any[] = [];
    let isTruncated = true;
    let nextToken: string | undefined = undefined;
    const prefix = 'logs/';

    while (isTruncated && results.length < limit) {
      const { files, isTruncated: isMoreFiles, nextToken: token } = await listS3Objects(prefix, S3_LIST_PAGE_SIZE, nextToken);
      if (files.length === 0) break;
      nextToken = token;

      files.sort((a, b) => {
        const dateA = a.Key?.match(/(\d{4}-\d{2}-\d{2})/)?.[0] || '';
        const dateB = b.Key?.match(/(\d{4}-\d{2}-\d{2})/)?.[0] || '';
        return dateB.localeCompare(dateA);
      });

      for (const file of files) {
        if (results.length >= limit) break;
        if (!file.Key || !file.Key.endsWith('.html')) continue;

        const fileResults = await processSingleS3File(
          bucketName,
          file.Key,
          query,
          limit - results.length,
          fromDate,
          toDate,
          user
        );
        results.push(...fileResults);
      }

      isTruncated = isMoreFiles;
    }

    return results;
  } catch (s3Error) {
    console.error("S3 search error:", s3Error);
    return [];
  }
}
