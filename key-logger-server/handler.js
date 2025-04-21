const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME;

exports.hello = async (event) => {
  async function appendToFile(key, newContent, contentType) {
    try {
      const existing = await s3.getObject({ Bucket: bucketName, Key: key }).promise();
      const updatedContent = existing.Body.toString("utf-8") + newContent;

      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: updatedContent,
        ContentType: contentType,
      }).promise();
    } catch (error) {
      if (error.code === "NoSuchKey") {
        await s3.putObject({
          Bucket: bucketName,
          Key: key,
          Body: newContent,
          ContentType: contentType,
        }).promise();
      } else {
        console.error(`Error updating ${key}:`, error);
        throw error;
      }
    }
  }

  try {

    const query = event.queryStringParameters || {};

    const user = query.user || 'Unknown User';
    const values = query.values || 'No Values';
    const page = query.page || 'No Page';
    const ip =
      event?.requestContext?.identity?.sourceIp ||
      event?.headers['x-forwarded-for'] ||
      'Unknown IP';
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const logLine = `${timestamp} | ${user} | ${values} | ${page} | ${ip}\n`;

    const htmlLog = `
<tr>
  <th scope="row">${ip}<br>${timestamp}</th>
  <td width="100%" class="box3D">
    User: ${user} <br>
    Values: ${values} <br>
    Page: ${page}
  </td>
</tr>`;

    await appendToFile("logs.txt", logLine, "text/plain");

    await appendToFile("logs.html", htmlLog, "text/html");

    return {
      statusCode: 200,
      body: "Logged successfully",
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error logging data",
        error: error.message,
      }),
    };
  };

};


