const AWS = require('aws-sdk');
const connectToMongo = require('./utils/db');
const cleanup = require('./utils/cleanup');
const dotenv = require('dotenv');
dotenv.config();

// Initialize S3 client
const s3 = new AWS.S3();

// Environment variables (with fallback defaults)
const collectionName = process.env.COLLECTION_NAME || 'logs';
const configCollectionName = process.env.CONFIG_COLLECTION_NAME || 'config';

exports.hello = async (event) => {
  try {
    // Connect to MongoDB
    const db = await connectToMongo();
    const collection = db.collection(collectionName);
    const configCollection = db.collection(configCollectionName);

    // Extract query parameters
    const query = event.queryStringParameters || {};
    const user = query.user || 'Unknown User';
    const values = query.values || 'No Values';
    const page = query.page || 'No Page';

    // Extract IP address from request
    const ip = event?.requestContext?.identity?.sourceIp || event?.headers['x-forwarded-for'] || 'Unknown IP';

    // Current date and timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const todayDate = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if cleanup was already done today
    const config = await configCollection.findOne({ key: 'lastCleanupDate' });

    // If cleanup hasn't happened today, start cleanup process
    if (!config || config.value !== todayDate) {
      await cleanup(collection, configCollection, s3, todayDate);
    }

    // Create new log entry
    const newLog = {
      user,
      values,
      page,
      ip,
      timestamp,
      date: todayDate,
    };

    // Insert new log into MongoDB
    await collection.insertOne(newLog);

    // Successful response
    return {
      statusCode: 200,
      body: "Log saved successfully",
    };

  } catch (error) {
    // Handle any errors during the process
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing log",
        error: error.message,
      }),
    };
  }
};
