const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
const mongoUri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'logsDB';

let cachedDb = null;
async function connectToMongo() {
    if (cachedDb) return cachedDb;
    const client = await MongoClient.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    cachedDb = client.db(dbName);
    return cachedDb;
}

module.exports = connectToMongo;