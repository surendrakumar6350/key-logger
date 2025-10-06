// S3 utilities for fetching log files from S3
import AWS from 'aws-sdk';

// Configure AWS SDK
export const configureS3 = () => {
  // Use the same region as your S3 bucket
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  return new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
};

/**
 * Lists S3 objects with pagination
 * @param prefix - S3 prefix to list objects from
 * @param maxFiles - Maximum number of files to return
 * @param continuationToken - Token for pagination
 * @returns List of S3 objects and continuation token
 */
export const listS3Objects = async (
  prefix: string = 'logs/', 
  maxFiles: number = 100, 
  continuationToken?: string
): Promise<{ 
  files: AWS.S3.ObjectList, 
  isTruncated: boolean,
  nextToken?: string
}> => {
  const s3 = configureS3();
  const bucketName =
    process.env.S3_BUCKET_NAME ??
    process.env.BUCKET_NAME ??
    process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not defined');
  }
  
  const params: AWS.S3.ListObjectsV2Request = {
    Bucket: bucketName,
    Prefix: prefix,
    MaxKeys: maxFiles,
  };
  
  if (continuationToken) {
    params.ContinuationToken = continuationToken;
  }
  
  try {
    const response = await s3.listObjectsV2(params).promise();
    return {
      files: response.Contents || [],
      isTruncated: !!response.IsTruncated,
      nextToken: response.NextContinuationToken
    };
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    throw error;
  }
};

/**
 * Parse logs from text format into structured objects
 * Expects each line to be in format: "timestamp | user | values | page | ip"
 */
export const parseTextLogs = (textContent: string, dateString?: string): any[] => {
  const lines = textContent.trim().split('\n');
  
  return lines.map(line => {
    // Split into at most 5 parts; if more than 5 due to ' | ' in values, merge middle parts back
    const parts = line.split(' | ');
    const timestamp = parts[0] || '';
    const user = parts[1] || '';
    const ip = parts[parts.length - 1] || '';
    const page = parts.length >= 4 ? parts[parts.length - 2] : '';
    const values = parts.length > 4 ? parts.slice(2, parts.length - 2).join(' | ') : (parts[2] || '');

    // Prefer the requested dateString as the canonical date
    const date = dateString || '';

    return { timestamp, user, values, page, ip, date };
  });
};

/**
 * Parse logs from simple HTML rows into structured objects.
 * Expected structure per row:
 * <tr>
 *   <th scope="row">IP<br>TIMESTAMP</th>
 *   <td>
 *     User: ... <br>
 *     Values: ... <br>
 *     Page: ...
 *   </td>
 * </tr>
 */
export const parseHtmlLogs = (htmlContent: string, dateString?: string): any[] => {
  const rows: any[] = [];
  const parts = htmlContent.split(/<tr[^>]*>/i).slice(1); // skip leading content before first <tr>

  for (const part of parts) {
    const rowHtml = '<tr>' + part; // normalize
    const thMatch = rowHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const tdMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!thMatch || !tdMatch) continue;

    const thInner = thMatch[1];
    // Capture IP and timestamp split by <br>
    const ipTsMatch = thInner.match(/\s*([^<]+)\s*<br\s*\/?>([\s\S]*)/i);
    const ip = ipTsMatch ? ipTsMatch[1].trim() : '';
    const timestamp = ipTsMatch ? ipTsMatch[2].replace(/<[^>]+>/g, '').trim() : '';

    const tdInner = tdMatch[1];
    const userMatch = tdInner.match(/User:\s*([\s\S]*?)\s*<br\s*\/?\s*>/i);
    const valuesMatch = tdInner.match(/Values:\s*([\s\S]*?)\s*<br\s*\/?\s*>/i);
    const pageMatch = tdInner.match(/Page:\s*([\s\S]*?)\s*$/i);

    const user = userMatch ? userMatch[1].trim() : '';
    const values = valuesMatch ? valuesMatch[1].trim() : '';
    const page = pageMatch ? pageMatch[1].trim() : '';

    rows.push({ timestamp, user, values, page, ip, date: dateString || '' });
  }

  return rows;
};

/**
 * Process S3 file content with streaming to minimize memory usage
 * @param bucket S3 bucket name
 * @param key S3 key
 * @param processor Function that processes chunks of data
 */
export const processS3FileStream = async (
  bucket: string,
  key: string,
  processor: (chunk: string) => void
): Promise<void> => {
  const s3 = configureS3();
  
  return new Promise((resolve, reject) => {
    const stream = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();
    let buffer = '';
    
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      // Process in chunks of roughly 1MB to avoid excessive memory usage
      if (buffer.length > 1024 * 1024) {
        processor(buffer);
        buffer = '';
      }
    });
    
    stream.on('end', () => {
      // Process any remaining data
      if (buffer.length > 0) {
        processor(buffer);
      }
      resolve();
    });
    
    stream.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Fetch logs from S3 for a specific date
 * @param dateString Format: YYYY-MM-DD
 */
/**
 * Search for matching logs in S3 file without loading entire file into memory
 * @param bucketName S3 bucket name
 * @param key S3 file key
 * @param query Search query
 * @param dateString Date string to add to log objects
 * @param limit Maximum number of results to return
 */
export const searchLogsInS3File = async (
  bucketName: string,
  key: string,
  query: string,
  dateString: string,
  limit: number
): Promise<any[]> => {
  const isHtml = key.endsWith('.html');
  const results: any[] = [];
  const lowerQuery = query.toLowerCase();
  
  try {
    if (isHtml) {
      // For HTML files, we need to load the entire content for proper parsing
      // HTML files are generally smaller and structured, so this is acceptable
      const data = await configureS3().getObject({ Bucket: bucketName, Key: key }).promise();
      const htmlContent = data.Body?.toString() || '';
      const logs = parseHtmlLogs(htmlContent, dateString);
      
      // Filter logs that match the query
      for (const log of logs) {
        if (results.length >= limit) break;
        
        if ((log.user && log.user.toLowerCase().includes(lowerQuery)) ||
            (log.values && log.values.toLowerCase().includes(lowerQuery)) ||
            (log.page && log.page.toLowerCase().includes(lowerQuery)) ||
            (log.ip && log.ip.toLowerCase().includes(lowerQuery))) {
          results.push(log);
        }
      }
    } else {
      // For text files, process line by line to avoid memory issues
      let lineBuffer = '';
      
      await processS3FileStream(bucketName, key, (chunk) => {
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        // Keep the last line in buffer as it might be incomplete
        lineBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (results.length >= limit) break;
          
          if (line.toLowerCase().includes(lowerQuery)) {
            // Parse the matching line
            const parts = line.split(' | ');
            const timestamp = parts[0] || '';
            const user = parts[1] || '';
            const ip = parts[parts.length - 1] || '';
            const page = parts.length >= 4 ? parts[parts.length - 2] : '';
            const values = parts.length > 4 ? parts.slice(2, parts.length - 2).join(' | ') : (parts[2] || '');
            
            results.push({ timestamp, user, values, page, ip, date: dateString });
          }
        }
      });
      
      // Process any remaining line in buffer
      if (lineBuffer && results.length < limit && lineBuffer.toLowerCase().includes(lowerQuery)) {
        const parts = lineBuffer.split(' | ');
        const timestamp = parts[0] || '';
        const user = parts[1] || '';
        const ip = parts[parts.length - 1] || '';
        const page = parts.length >= 4 ? parts[parts.length - 2] : '';
        const values = parts.length > 4 ? parts.slice(2, parts.length - 2).join(' | ') : (parts[2] || '');
        
        results.push({ timestamp, user, values, page, ip, date: dateString });
      }
    }
    
    return results;
  } catch (error: any) {
    if (error.code === 'NoSuchKey' || error.statusCode === 404) {
      return [];
    }
    throw error;
  }
};

export const fetchLogsFromS3 = async (dateString: string): Promise<any[]> => {
  const s3 = configureS3();
  const bucketName = process.env.S3_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not defined');
  }
  
  try {
    // Try HTML first for better parsing
    const paramsHtml = {
      Bucket: bucketName,
      Key: `logs/${dateString}.html`,
    };

    try {
      const dataHtml = await s3.getObject(paramsHtml).promise();
      const htmlContent = dataHtml.Body?.toString() || '';
      if (htmlContent.trim().length > 0) {
        return parseHtmlLogs(htmlContent, dateString);
      }
    } catch (err: any) {
      if (err.code !== 'NoSuchKey' && err.statusCode !== 404) {
        // Unexpected error for HTML — rethrow
        throw err;
      }
    }

    // Fallback to TXT
    const paramsTxt = {
      Bucket: bucketName,
      Key: `logs/${dateString}.txt`,
    };
    const dataTxt = await s3.getObject(paramsTxt).promise();
    const textContent = dataTxt.Body?.toString() || '';
    return parseTextLogs(textContent, dateString);
  } catch (error: any) {
    // Check if the error is because the file doesn't exist
    if (error.code === 'NoSuchKey') {
      return []; // Return empty array if no logs for that date
    }
    throw error;
  }
};