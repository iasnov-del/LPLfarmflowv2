import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

function getTargetDbName(uri: string): string {
  if (process.env.MONGODB_DB_NAME && process.env.MONGODB_DB_NAME.trim()) {
    return process.env.MONGODB_DB_NAME.trim();
  }
  try {
    const withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\/[^/]+\//, "");
    if (withoutProtocol && !withoutProtocol.startsWith("?")) {
      const parsed = withoutProtocol.split("?")[0].trim();
      if (parsed) return parsed;
    }
  } catch {}
  return "farm_management";
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URl || "MISSING_MONGODB_URI";

async function check() {
  let uri = MONGODB_URI.trim();
  if (uri === "MISSING_MONGODB_URI" || !uri) {
    console.error("❌ MONGODB_URI is not set. Please add it to your .env or .env.local file.");
    process.exit(1);
  }

  if (uri.includes("?")) {
    const [base, query] = uri.split("?");
    const params = query.split("&");
    const validParams = params.filter(p => p.includes("=") && !p.includes(" "));
    uri = base + (validParams.length > 0 ? "?" + validParams.join("&") : "");
  }
  uri = uri.replace(/\s/g, "");
  
  const dbName = getTargetDbName(uri);
  console.log("🔍 Checking MongoDB connection...");
  console.log("   Target Database:", dbName);
  
  try {
    await mongoose.connect(uri, { 
      dbName, 
      serverSelectionTimeoutMS: 8000 
    });
    console.log("✅ Successfully connected to MongoDB Atlas!");
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:`);
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`   - ${coll.name}: ${count} document(s)`);
    }

    await mongoose.connection.close();
    console.log("✨ MongoDB check completed successfully.");
  } catch (err: any) {
    console.error("❌ MongoDB connection failed:", err.message);
    if (err.message.includes("IP") || err.message.includes("whitelist") || err.message.includes("buffering timed out") || err.message.includes("ETIMEDOUT")) {
      console.error("💡 Hint: Ensure your current IP or 0.0.0.0/0 (allow all) is added to 'Network Access' in your MongoDB Atlas dashboard.");
    }
    if (err.message.includes("Authentication failed")) {
      console.error("💡 Hint: Check your username and password in MONGODB_URI. If your password has special characters, ensure they are URL-encoded.");
    }
    process.exit(1);
  }
}
check();

