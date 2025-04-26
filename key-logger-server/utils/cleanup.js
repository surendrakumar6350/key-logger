const uploadLogsToS3 = require('./uploadToS3');

async function cleanup(collection, configCollection, s3, todayDate) {
    const oldLogs = await collection.find({ date: { $ne: todayDate } }).toArray();

    if (oldLogs.length > 0) {
        const logsByDate = {};
        for (const log of oldLogs) {
            if (!logsByDate[log.date]) logsByDate[log.date] = [];
            logsByDate[log.date].push(log);
        }

        // Upload each set of old logs to S3
        for (const [dateStr, logs] of Object.entries(logsByDate)) {
            await uploadLogsToS3(logs, dateStr, s3);
            await collection.deleteMany({ date: dateStr });
        }
    }

    // Update the last cleanup date in config
    await configCollection.updateOne(
        { key: 'lastCleanupDate' },
        { $set: { value: todayDate } },
        { upsert: true }
    );
}

module.exports = cleanup;