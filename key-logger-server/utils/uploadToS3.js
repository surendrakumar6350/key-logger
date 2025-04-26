const dotenv = require('dotenv');
dotenv.config();

const bucketName = process.env.BUCKET_NAME;

/**
 * Uploads logs to S3 in both text (.txt) and HTML (.html) formats
 * @param {Array} logs - Array of log objects { timestamp, user, values, page, ip }
 * @param {string} dateString - Date string like "2025-04-26"
 * @param {AWS.S3} s3 - S3 client instance
 */
async function uploadLogsToS3(logs, dateString, s3) {
  if (!bucketName) {
    throw new Error("BUCKET_NAME is not defined in .env");
  }

  // Text version
  const textContent = logs.map(log =>
    `${log.timestamp} | ${log.user} | ${log.values} | ${log.page} | ${log.ip}`
  ).join('\n');

  // HTML version
  const htmlContent = logs.map(log => `
<tr>
  <th scope="row">${log.ip}<br>${log.timestamp}</th>
  <td width="100%" class="box3D">
    User: ${log.user} <br>
    Values: ${log.values} <br>
    Page: ${log.page}
  </td>
</tr>`).join('\n');

  // Upload text log
  await s3.putObject({
    Bucket: bucketName,
    Key: `logs/${dateString}.txt`,
    Body: textContent,
    ContentType: "text/plain",
  }).promise();

  // Upload HTML log
  await s3.putObject({
    Bucket: bucketName,
    Key: `logs/${dateString}.html`,
    Body: htmlContent,
    ContentType: "text/html",
  }).promise();
}

module.exports = uploadLogsToS3;
