import { MongoClient, type Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export type StoredMongoDoc = {
  _id: string;
  data: unknown;
  revision?: number;
  updatedAt?: Date;
};

export type StoredUserSnapshot = {
  _id: string;
  userId: string;
  name: string;
  data: unknown;
  createdAt: string;
};

let clientPromise: Promise<MongoClient> | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined.");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10
      });
      global._mongoClientPromise = client.connect().catch((error) => {
        global._mongoClientPromise = undefined;
        throw error;
      });
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10
    });
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB_NAME?.trim();
  if (dbName) {
    return client.db(dbName);
  }
  return client.db("learning_tracker");
}

export async function checkMongoHealth(): Promise<void> {
  const db = await getMongoDb();
  await db.command({ ping: 1 });
}
