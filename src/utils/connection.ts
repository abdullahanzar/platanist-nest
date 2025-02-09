import { Db, MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client: MongoClient;
let mongoDBClient: Promise<MongoClient>;
let db: Db;

if (!uri) {
  throw new Error('Please add your MongoDB URI to the .env.local file');
}

// Declare a global variable for development to reuse the MongoClient instance
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  mongoDBClient = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  mongoDBClient = client.connect();
}

export const mongoDB = async (): Promise<Db> => {
    if (!db) {
      db = (await mongoDBClient).db("platanist-core");
    }
    return db;
  };

export default mongoDBClient;
