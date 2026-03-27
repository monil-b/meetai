import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error("Please add MONGODB_URI to .env");
}

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  if (!(global as any)._mongoClient) {
    (global as any)._mongoClient = new MongoClient(uri);
  }
  client = (global as any)._mongoClient;
} else {
  client = new MongoClient(uri);
}

export { client };