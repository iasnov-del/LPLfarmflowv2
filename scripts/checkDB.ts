import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URl || "MISSING_MONGODB_URI";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "production";

async function check() {
  let uri = MONGODB_URI.trim();
  if (uri.includes("?")) {
    const [base, query] = uri.split("?");
    const params = query.split("&");
    const validParams = params.filter(p => p.includes("=") && !p.includes(" "));
    uri = base + (validParams.length > 0 ? "?" + validParams.join("&") : "");
  }
  uri = uri.replace(/\s/g, "");
  
  console.log("URI (sanitized):", uri.substring(0, 25) + "...");
  console.log("Database:", MONGODB_DB_NAME);
  try {
    await mongoose.connect(uri, { dbName: MONGODB_DB_NAME });
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`Collection ${coll.name}: ${count} documents`);
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}
check();
