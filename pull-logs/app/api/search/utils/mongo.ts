import { connectDb } from "@/dbConnection/connect";
import { Log } from "@/dbConnection/Schema/logSchema";

export async function searchMongoDB(
  query: string,
  limit: number,
  skip: number,
  fromDate?: string,
  toDate?: string,
  user?: string
): Promise<any[]> {
  try {
    await connectDb();

    const searchCondition: any = {
      $or: [
        { user: { $regex: query, $options: 'i' } },
        { values: { $regex: query, $options: 'i' } },
        { page: { $regex: query, $options: 'i' } },
        { ip: { $regex: query, $options: 'i' } }
      ]
    };

    if (fromDate || toDate) {
      searchCondition.timestamp = {};
      if (fromDate) searchCondition.timestamp.$gte = new Date(fromDate).toISOString();
      if (toDate) searchCondition.timestamp.$lte = new Date(toDate).toISOString();
    }

    if (user) {
      searchCondition.user = { $regex: user, $options: 'i' };
    }

    const results = await Log.find(searchCondition)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return results;
  } catch (error) {
    console.error("MongoDB search error:", error);
    return [];
  }
}
