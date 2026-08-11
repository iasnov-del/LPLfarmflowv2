import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URl || "MISSING_MONGODB_URI";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "production";

// --- Mongoose Schemas & Models ---

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: "worker" },
  full_name: String,
  assigned_flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock", default: null }
});
const User = mongoose.model("User", userSchema);

const farmProfileSchema = new mongoose.Schema({
  name: String,
  address: String,
  logo_url: String
});
const FarmProfile = mongoose.model("FarmProfile", farmProfileSchema);

const flockSchema = new mongoose.Schema({
  house_number: String,
  beginning_male: Number,
  beginning_female: Number,
  loading_date: String,
  breed: String,
  status: { type: String, default: "active" }
});
const Flock = mongoose.model("Flock", flockSchema);

const feedTypeSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  category: String
});
const FeedType = mongoose.model("FeedType", feedTypeSchema);

const feedInventorySchema = new mongoose.Schema({
  feed_type_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeedType", unique: true },
  beginning_stock: { type: Number, default: 0 },
  current_stock: { type: Number, default: 0 }
});
const FeedInventory = mongoose.model("FeedInventory", feedInventorySchema);

const feedIncomingSchema = new mongoose.Schema({
  feed_type_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeedType" },
  quantity_kg: Number,
  date: String,
  notes: String
});
const FeedIncoming = mongoose.model("FeedIncoming", feedIncomingSchema);

const feedConsumptionSchema = new mongoose.Schema({
  flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock" },
  feed_type_male_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeedType" },
  feed_type_female_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeedType" },
  quantity_male_kg: { type: Number, default: 0 },
  quantity_female_kg: { type: Number, default: 0 },
  quantity_kg: Number,
  date: String
});
const FeedConsumption = mongoose.model("FeedConsumption", feedConsumptionSchema);

const mortalityRecordSchema = new mongoose.Schema({
  flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock" },
  date: String,
  male_mortality: { type: Number, default: 0 },
  female_mortality: { type: Number, default: 0 },
  male_spot_cull: { type: Number, default: 0 },
  female_spot_cull: { type: Number, default: 0 },
  male_spent_cull: { type: Number, default: 0 },
  female_spent_cull: { type: Number, default: 0 },
  male_missex: { type: Number, default: 0 },
  female_missex: { type: Number, default: 0 },
  reported_by: String
});
const MortalityRecord = mongoose.model("MortalityRecord", mortalityRecordSchema);

const eggProductionSchema = new mongoose.Schema({
  flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock" },
  date: String,
  hatching_eggs: { type: Number, default: 0 },
  he_floor_eggs: { type: Number, default: 0 },
  small: { type: Number, default: 0 },
  thin_shell: { type: Number, default: 0 },
  misshape: { type: Number, default: 0 },
  double_yolk: { type: Number, default: 0 },
  broken: { type: Number, default: 0 },
  spoiled: { type: Number, default: 0 },
  others: { type: Number, default: 0 },
  reported_by: String
});
const EggProduction = mongoose.model("EggProduction", eggProductionSchema);

const medicineInventorySchema = new mongoose.Schema({
  name: String,
  type_id: { type: mongoose.Schema.Types.ObjectId, ref: "MedicineType" },
  type: String, // Keep for backward compatibility/display
  manufacturer: String,
  expiration_date: String,
  image_url: String,
  stock_quantity: { type: Number, default: 0 },
  unit_type: { type: String, default: "Vial" },
  capacity_per_unit: { type: Number, default: 1000 }
});
const MedicineInventory = mongoose.model("MedicineInventory", medicineInventorySchema);

const medicineTypeSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true }
});
const MedicineType = mongoose.model("MedicineType", medicineTypeSchema);

const medicineAdministrationSchema = new mongoose.Schema({
  medicine_id: { type: mongoose.Schema.Types.ObjectId, ref: "MedicineInventory" },
  flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock" },
  date: String,
  method: String,
  peripherals: String,
  peripheral_quantity: { type: Number, default: 0 },
  quantity: Number
});
const MedicineAdministration = mongoose.model("MedicineAdministration", medicineAdministrationSchema);

const medicineIncomingSchema = new mongoose.Schema({
  medicine_id: { type: mongoose.Schema.Types.ObjectId, ref: "MedicineInventory" },
  quantity: Number,
  date: String,
  notes: String
});
const MedicineIncoming = mongoose.model("MedicineIncoming", medicineIncomingSchema);

const employeeSchema = new mongoose.Schema({
  employee_id_no: { type: String, unique: true },
  name: String,
  birthday: String,
  address: String,
  contact_no: String,
  email: String,
  date_hired: String,
  position: String,
  resignation_date: String,
  image_url: String
});
const Employee = mongoose.model("Employee", employeeSchema);

const dtrSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  time_in: { type: String }, // HH:MM:SS or ISO String
  time_out: { type: String },
  time_in_photo: { type: String },
  time_out_photo: { type: String },
  time_in_verification_confidence: { type: Number },
  time_out_verification_confidence: { type: Number },
  status: { type: String, default: "present" }, // present, late, completed
  notes: { type: String }
});
const DailyTimeRecord = mongoose.model("DailyTimeRecord", dtrSchema);

const flockTransferSchema = new mongoose.Schema({
  from_flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock" },
  to_flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock" },
  male_count: { type: Number, default: 0 },
  female_count: { type: Number, default: 0 },
  date: String,
  reason: String,
  reported_by: String
});
const FlockTransfer = mongoose.model("FlockTransfer", flockTransferSchema);

const weightStandardSchema = new mongoose.Schema({
  breed: { type: String, required: true }, // Cobb or Ross
  week: { type: Number, required: true },
  standard_weight_male: { type: Number, default: 0 },
  standard_weight_female: { type: Number, default: 0 }
});
weightStandardSchema.index({ breed: 1, week: 1 }, { unique: true });
const WeightStandard = mongoose.model("WeightStandard", weightStandardSchema);

const weightRecordSchema = new mongoose.Schema({
  flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock", required: true },
  week: { type: Number, required: true },
  actual_weight_male: { type: Number, default: 0 },
  actual_weight_female: { type: Number, default: 0 },
  date: String,
  reported_by: String
});
weightRecordSchema.index({ flock_id: 1, week: 1 }, { unique: true });
const WeightRecord = mongoose.model("WeightRecord", weightRecordSchema);

const passwordResetRequestSchema = new mongoose.Schema({
  username: { type: String, required: true },
  new_password: { type: String, required: true },
  full_name: String,
  status: { type: String, default: "pending" }, // pending, approved, rejected
  created_at: { type: Date, default: Date.now }
});
const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);

const treatmentPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }, // Vaccine, Medicine, Supplement
  ageDays: { type: Number, required: true },
  dosage: String,
  dosageValue: { type: Number, required: true },
  dosageUnit: String,
  method: String,
  diseases: String,
  description: String,
  details: String
});
const TreatmentPlan = mongoose.model("TreatmentPlan", treatmentPlanSchema);

// --- End Models ---

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  
  // Minimal logger
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  const PORT = 3000;
  
  // Start listening immediately so the frontend can at least reach the server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Connect to MongoDB in the background
  const connectDB = async () => {
    try {
      let uri = MONGODB_URI.trim();
      
      if (uri === "MISSING_MONGODB_URI") {
        console.error("CRITICAL: MONGODB_URI is missing. Please set it in Settings > Environment Variables.");
        return;
      } 
      
      if (uri.includes("<password>") || uri.includes("<") || uri.includes(">")) {
        console.error("CRITICAL: MONGODB_URI contains placeholder characters '<' or '>'.");
        return;
      }

      // Improve sanitization: remove invalid options that don't have '='
      if (uri.includes("?")) {
        const [base, query] = uri.split("?");
        const params = query.split("&");
        const validParams = params.filter(p => p.includes("=") && !p.includes(" "));
        if (validParams.length !== params.length) {
          console.warn("WARNING: MONGODB_URI contained invalid or malformed options. Rewriting URI...");
          uri = base + (validParams.length > 0 ? "?" + validParams.join("&") : "");
        }
      }

      // Final space removal just in case
      uri = uri.replace(/\s/g, "");

      console.log("Attempting to connect to MongoDB...");
      
      mongoose.connection.on('error', (err) => {
        console.error("MongoDB Connection Error Event:", err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn("MongoDB Disconnected Event");
      });

      await mongoose.connect(uri, {
        dbName: MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 5000,
      });
      console.log("Connected to MongoDB successfully");

      // Seed initial admin if not exists
      const adminExists = await User.findOne({ username: "admin" });
      if (!adminExists) {
        const hashedPassword = bcrypt.hashSync("FarmFlowAdmin2026!", 10);
        await User.create({
          username: "admin",
          password: hashedPassword,
          role: "admin",
          full_name: "System Administrator"
        });
      }

      // Seed initial farm profile if not exists
      const farmExists = await FarmProfile.findOne();
      if (!farmExists) {
        await FarmProfile.create({
          name: "My Poultry Farm",
          address: "123 Farm Lane"
        });
      }
    } catch (err: any) {
      console.error("CRITICAL: Failed to connect to MongoDB:", err.message);
    }
  };

  connectDB();

  // Middleware to check DB connection for API routes
  app.use("/api", (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      let message = "Database connection is not established. Please check your MONGODB_URI and IP whitelist in Atlas.";
      if (MONGODB_URI === "MISSING_MONGODB_URI") {
        message = "MONGODB_URI is missing. Please set it in Settings > Environment Variables.";
      } else if (MONGODB_URI.includes("<") || MONGODB_URI.includes(">")) {
        message = "MONGODB_URI contains placeholder characters '<' or '>'. Please remove them from your password in Settings.";
      }
      return res.status(503).json({ 
        success: false, 
        message,
        dbStatus: mongoose.connection.readyState
      });
    }
    next();
  });

  // Helper to map _id to id for frontend
  const mapId = (doc: any) => {
    if (!doc) return doc;
    const obj = doc.toObject ? doc.toObject() : doc;
    obj.id = obj._id.toString();
    return obj;
  };

  // Async error wrapper
  const catchAsync = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Seed Data Trigger
  app.post("/api/seed", catchAsync(async (req: express.Request, res: express.Response) => {
    try {
      // Import the seed logic or just run it here
      const adminPassword = await bcrypt.hash("FarmFlowAdmin2026!", 10);
      const workerPassword = await bcrypt.hash("worker123", 10);
      
      // Clear existing (optional - user might want to keep some, but for 'sync' we usually want a clean state if they ask)
      // For safety, let's just ensure admin exists and maybe add some sample data if the collections are empty
      
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        await User.create({ username: "admin", password: adminPassword, role: "admin", full_name: "Ricardo Santos" });
        await User.create({ username: "worker", password: workerPassword, role: "worker", full_name: "Bernardo Silva" });
      }

      const flockCount = await Flock.countDocuments();
      if (flockCount === 0) {
        const today = new Date();
        const date4MonthsAgo = new Date();
        date4MonthsAgo.setMonth(today.getMonth() - 4);
        const date2MonthsAgo = new Date();
        date2MonthsAgo.setMonth(today.getMonth() - 2);

        await Flock.insertMany([
          { house_number: "H01", beginning_male: 380, beginning_female: 4200, loading_date: date4MonthsAgo.toISOString().split('T')[0], breed: "Cobb", status: "active" },
          { house_number: "H02", beginning_male: 450, beginning_female: 5000, loading_date: date2MonthsAgo.toISOString().split('T')[0], breed: "Ross", status: "active" }
        ]);
      }

      const farmCount = await FarmProfile.countDocuments();
      if (farmCount === 0) {
        await FarmProfile.create({
          name: "Golden Feather Poultry",
          address: "Malaybalay City, Bukidnon",
          logo_url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=200&h=200"
        });
      }

      res.json({ success: true, message: "Sync/Seed completed. Ensure you use admin / FarmFlowAdmin2026!" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }));

  // API Routes
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    });
  });

  // Auth
  app.post("/api/login", catchAsync(async (req: express.Request, res: express.Response) => {
    const { username, password } = req.body;
    
    // Try exact match first, then case-insensitive
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.findOne({ username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });
    }
    
    if (user) {
      let isMatch = false;
      // Check if password is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
      const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
      
      if (isHashed) {
        try {
          isMatch = await bcrypt.compare(password, user.password);
        } catch (err) {
          console.error("Bcrypt compare error:", err);
          isMatch = false;
        }
      } else {
        // Migration: Check plain text and upgrade if it matches
        isMatch = password === user.password;
        if (isMatch) {
          // Upgrade to hashed password
          user.password = await bcrypt.hash(password, 10);
          await user.save();
          console.log(`Upgraded password for user: ${user.username}`);
        }
      }

      if (isMatch) {
        res.json({ 
          success: true, 
          user: { 
            id: user._id, 
            username: user.username, 
            role: user.role, 
            fullName: user.full_name,
            assigned_flock_id: user.assigned_flock_id
          } 
        });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  }));

  app.post("/api/register", catchAsync(async (req: express.Request, res: express.Response) => {
    const { username, password, fullName, role, assigned_flock_id } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({ 
        username, 
        password: hashedPassword, 
        full_name: fullName, 
        role: role || 'worker',
        assigned_flock_id: assigned_flock_id || null
      });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: "Username already exists" });
    }
  }));

  // Farm Profile
  app.get("/api/farm", catchAsync(async (req: express.Request, res: express.Response) => {
    const farm = await FarmProfile.findOne();
    res.json(mapId(farm));
  }));

  app.post("/api/farm", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, address, logo_url } = req.body;
    await FarmProfile.findOneAndUpdate({}, { name, address, logo_url }, { upsert: true });
    res.json({ success: true });
  }));

  // Flocks
  app.get("/api/flocks", catchAsync(async (req: express.Request, res: express.Response) => {
    const flocks = await Flock.find();
    res.json(flocks.map(mapId));
  }));

  app.post("/api/flocks", catchAsync(async (req: express.Request, res: express.Response) => {
    const { house_number, beginning_male, beginning_female, loading_date, breed } = req.body;
    await Flock.create({ house_number, beginning_male, beginning_female, loading_date, breed });
    res.json({ success: true });
  }));

  app.put("/api/flocks/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { house_number, beginning_male, beginning_female, loading_date, breed, status } = req.body;
    await Flock.findByIdAndUpdate(req.params.id, { house_number, beginning_male, beginning_female, loading_date, breed, status });
    res.json({ success: true });
  }));

  // Flock Transfers
  app.get("/api/flock-transfers", catchAsync(async (req: express.Request, res: express.Response) => {
    const transfers = await FlockTransfer.find()
      .populate("from_flock_id")
      .populate("to_flock_id");
    
    const mapped = transfers.map(t => {
      const obj = mapId(t);
      obj.from_house = t.from_flock_id ? (t.from_flock_id as any).house_number : null;
      obj.to_house = t.to_flock_id ? (t.to_flock_id as any).house_number : null;
      return obj;
    });
    res.json(mapped);
  }));

  app.post("/api/flock-transfers", catchAsync(async (req: express.Request, res: express.Response) => {
    const { from_flock_id, to_flock_id, male_count, female_count, date, reason, reported_by } = req.body;
    await FlockTransfer.create({
      from_flock_id: from_flock_id || null,
      to_flock_id: to_flock_id || null,
      male_count,
      female_count,
      date,
      reason,
      reported_by
    });
    res.json({ success: true });
  }));

  // Feed Management
  app.get("/api/feed-types", catchAsync(async (req: express.Request, res: express.Response) => {
    const types = await FeedType.find();
    res.json(types.map(mapId));
  }));

  app.post("/api/feed-types", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, category, beginning_stock } = req.body;
    const type = await FeedType.create({ name, category });
    await FeedInventory.create({ 
      feed_type_id: type._id, 
      beginning_stock: Number(beginning_stock) || 0,
      current_stock: Number(beginning_stock) || 0
    });
    res.json({ success: true });
  }));

  app.get("/api/feed-inventory", catchAsync(async (req: express.Request, res: express.Response) => {
    // Pre-populate specific feed types if they don't exist
    const defaultTypes = [
      { name: "CSC1", category: "Starter" },
      { name: "CSC2", category: "Grower" },
      { name: "CBB1", category: "Breeder" }
    ];

    for (const dt of defaultTypes) {
      await FeedType.findOneAndUpdate(
        { name: dt.name },
        { $setOnInsert: dt },
        { upsert: true }
      );
    }

    const types = await FeedType.find();
    for (const type of types) {
      await FeedInventory.findOneAndUpdate(
        { feed_type_id: type._id },
        { $setOnInsert: { current_stock: 0 } },
        { upsert: true, new: true }
      );
    }

    const inventory = await FeedInventory.find().populate("feed_type_id");
    const mapped = inventory.map(fi => {
      const obj = mapId(fi);
      obj.name = fi.feed_type_id ? (fi.feed_type_id as any).name : "Unknown";
      obj.category = fi.feed_type_id ? (fi.feed_type_id as any).category : "N/A";
      return obj;
    }).filter(item => item.name !== "Unknown"); // Filter out orphans if any
    res.json(mapped);
  }));

  app.get("/api/feed-incoming", catchAsync(async (req: express.Request, res: express.Response) => {
    const history = await FeedIncoming.find().populate("feed_type_id");
    const mapped = history.map(fi => {
      const obj = mapId(fi);
      obj.name = fi.feed_type_id ? (fi.feed_type_id as any).name : null;
      return obj;
    });
    res.json(mapped);
  }));

  app.get("/api/feed-consumption", catchAsync(async (req: express.Request, res: express.Response) => {
    const history = await FeedConsumption.find()
      .populate("feed_type_male_id")
      .populate("feed_type_female_id")
      .populate("flock_id");
    const mapped = history.map(fc => {
      const obj = mapId(fc);
      obj.feed_male_name = fc.feed_type_male_id ? (fc.feed_type_male_id as any).name : null;
      obj.feed_female_name = fc.feed_type_female_id ? (fc.feed_type_female_id as any).name : null;
      obj.house_number = fc.flock_id ? (fc.flock_id as any).house_number : null;
      return obj;
    });
    res.json(mapped);
  }));

  app.post("/api/feed-incoming", catchAsync(async (req: express.Request, res: express.Response) => {
    const { feed_type_id, quantity_kg, date, notes } = req.body;
    const qty = Number(quantity_kg) || 0;
    await FeedIncoming.create({ feed_type_id, quantity_kg: qty, date, notes });
    await FeedInventory.findOneAndUpdate({ feed_type_id }, { $inc: { current_stock: qty } }, { upsert: true });
    res.json({ success: true });
  }));

  app.put("/api/feed-incoming/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { feed_type_id, quantity_kg, date, notes } = req.body;
    const qty = Number(quantity_kg) || 0;

    const oldRecord = await FeedIncoming.findById(req.params.id);
    if (oldRecord) {
      // Reverse old inventory
      await FeedInventory.findOneAndUpdate({ feed_type_id: oldRecord.feed_type_id }, { $inc: { current_stock: -oldRecord.quantity_kg } });
    }

    await FeedIncoming.findByIdAndUpdate(req.params.id, { feed_type_id, quantity_kg: qty, date, notes });
    
    // Apply new inventory
    await FeedInventory.findOneAndUpdate({ feed_type_id }, { $inc: { current_stock: qty } }, { upsert: true });
    
    res.json({ success: true });
  }));

  app.delete("/api/feed-incoming/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const record = await FeedIncoming.findById(req.params.id);
    if (record) {
      await FeedInventory.findOneAndUpdate({ feed_type_id: record.feed_type_id }, { $inc: { current_stock: -record.quantity_kg } });
      await FeedIncoming.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  }));

  app.post("/api/feed-inventory/recalculate", catchAsync(async (req: express.Request, res: express.Response) => {
    const types = await FeedType.find();
    
    for (const type of types) {
      const inventory = await FeedInventory.findOne({ feed_type_id: type._id });
      const beginningStock = inventory?.beginning_stock || 0;

      const incoming = await FeedIncoming.find({ feed_type_id: type._id });
      const totalIncoming = incoming.reduce((acc, curr) => acc + (curr.quantity_kg || 0), 0);
      
      const consumptionMale = await FeedConsumption.find({ feed_type_male_id: type._id });
      const totalConsumptionMale = consumptionMale.reduce((acc, curr) => acc + (curr.quantity_male_kg || 0), 0);
      
      const consumptionFemale = await FeedConsumption.find({ feed_type_female_id: type._id });
      const totalConsumptionFemale = consumptionFemale.reduce((acc, curr) => acc + (curr.quantity_female_kg || 0), 0);
      
      const currentStock = Math.round((beginningStock + totalIncoming - totalConsumptionMale - totalConsumptionFemale) * 100) / 100;
      
      await FeedInventory.findOneAndUpdate(
        { feed_type_id: type._id },
        { current_stock: Math.max(0, currentStock) },
        { upsert: true }
      );
    }
    
    res.json({ success: true });
  }));

  app.post("/api/feed-consumption", catchAsync(async (req: express.Request, res: express.Response) => {
    const { flock_id, feed_type_male_id, feed_type_female_id, quantity_male_kg, quantity_female_kg, date } = req.body;
    const qMale = Number(quantity_male_kg) || 0;
    const qFemale = Number(quantity_female_kg) || 0;
    const total_quantity = Math.round((qMale + qFemale) * 100) / 100;
    
    await FeedConsumption.create({ 
      flock_id, 
      feed_type_male_id, 
      feed_type_female_id,
      quantity_male_kg: qMale, 
      quantity_female_kg: qFemale, 
      quantity_kg: total_quantity, 
      date 
    });

    if (feed_type_male_id && qMale > 0) {
      await FeedInventory.findOneAndUpdate({ feed_type_id: feed_type_male_id }, { $inc: { current_stock: -qMale } }, { upsert: true });
    }
    if (feed_type_female_id && qFemale > 0) {
      await FeedInventory.findOneAndUpdate({ feed_type_id: feed_type_female_id }, { $inc: { current_stock: -qFemale } }, { upsert: true });
    }
    
    res.json({ success: true });
  }));

  app.put("/api/feed-consumption/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { flock_id, feed_type_male_id, feed_type_female_id, quantity_male_kg, quantity_female_kg, date } = req.body;
    const qMale = Number(quantity_male_kg) || 0;
    const qFemale = Number(quantity_female_kg) || 0;
    const total_quantity = Math.round((qMale + qFemale) * 100) / 100;

    // Get old record to adjust inventory
    const oldRecord = await FeedConsumption.findById(req.params.id);
    if (oldRecord) {
      // Reverse old inventory changes
      if (oldRecord.feed_type_male_id && oldRecord.quantity_male_kg > 0) {
        await FeedInventory.findOneAndUpdate({ feed_type_id: oldRecord.feed_type_male_id }, { $inc: { current_stock: oldRecord.quantity_male_kg } }, { upsert: true });
      }
      if (oldRecord.feed_type_female_id && oldRecord.quantity_female_kg > 0) {
        await FeedInventory.findOneAndUpdate({ feed_type_id: oldRecord.feed_type_female_id }, { $inc: { current_stock: oldRecord.quantity_female_kg } }, { upsert: true });
      }
    }

    await FeedConsumption.findByIdAndUpdate(req.params.id, {
      flock_id,
      feed_type_male_id,
      feed_type_female_id,
      quantity_male_kg: qMale,
      quantity_female_kg: qFemale,
      quantity_kg: total_quantity,
      date
    });

    // Apply new inventory changes
    if (feed_type_male_id && qMale > 0) {
      await FeedInventory.findOneAndUpdate({ feed_type_id: feed_type_male_id }, { $inc: { current_stock: -qMale } }, { upsert: true });
    }
    if (feed_type_female_id && qFemale > 0) {
      await FeedInventory.findOneAndUpdate({ feed_type_id: feed_type_female_id }, { $inc: { current_stock: -qFemale } }, { upsert: true });
    }

    res.json({ success: true });
  }));

  app.delete("/api/feed-consumption", catchAsync(async (req: express.Request, res: express.Response) => {
    const { revertInventory } = req.query;
    
    if (revertInventory === 'true') {
      const records = await FeedConsumption.find({});
      for (const record of records) {
        if (record.feed_type_male_id && record.quantity_male_kg > 0) {
          await FeedInventory.findOneAndUpdate({ feed_type_id: record.feed_type_male_id }, { $inc: { current_stock: record.quantity_male_kg } }, { upsert: true });
        }
        if (record.feed_type_female_id && record.quantity_female_kg > 0) {
          await FeedInventory.findOneAndUpdate({ feed_type_id: record.feed_type_female_id }, { $inc: { current_stock: record.quantity_female_kg } }, { upsert: true });
        }
      }
    }
    
    await FeedConsumption.deleteMany({});
    res.json({ success: true });
  }));

  app.delete("/api/feed-consumption/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const record = await FeedConsumption.findById(req.params.id);
    if (record) {
      // Reverse inventory changes
      if (record.feed_type_male_id && record.quantity_male_kg > 0) {
        await FeedInventory.findOneAndUpdate({ feed_type_id: record.feed_type_male_id }, { $inc: { current_stock: record.quantity_male_kg } }, { upsert: true });
      }
      if (record.feed_type_female_id && record.quantity_female_kg > 0) {
        await FeedInventory.findOneAndUpdate({ feed_type_id: record.feed_type_female_id }, { $inc: { current_stock: record.quantity_female_kg } }, { upsert: true });
      }
      await FeedConsumption.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  }));

  app.post("/api/feed-consumption/batch", catchAsync(async (req: express.Request, res: express.Response) => {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: "Records must be an array" });
    }

    for (const record of records) {
      const { flock_id, feed_type_male_id, feed_type_female_id, quantity_male_kg, quantity_female_kg, date } = record;
      const qMale = Number(quantity_male_kg) || 0;
      const qFemale = Number(quantity_female_kg) || 0;
      const total_quantity = Math.round((qMale + qFemale) * 100) / 100;

      await FeedConsumption.create({
        flock_id,
        feed_type_male_id,
        feed_type_female_id,
        quantity_male_kg: qMale,
        quantity_female_kg: qFemale,
        quantity_kg: total_quantity,
        date
      });

      if (feed_type_male_id && qMale > 0) {
        await FeedInventory.findOneAndUpdate({ feed_type_id: feed_type_male_id }, { $inc: { current_stock: -qMale } }, { upsert: true });
      }
      if (feed_type_female_id && qFemale > 0) {
        await FeedInventory.findOneAndUpdate({ feed_type_id: feed_type_female_id }, { $inc: { current_stock: -qFemale } }, { upsert: true });
      }
    }

    res.json({ success: true });
  }));

  // Mortality
  app.get("/api/mortality", catchAsync(async (req: express.Request, res: express.Response) => {
    const records = await MortalityRecord.find().populate("flock_id");
    const mapped = records.map(mr => {
      const obj = mapId(mr);
      obj.house_number = mr.flock_id ? (mr.flock_id as any).house_number : null;
      return obj;
    });
    res.json(mapped);
  }));

  app.post("/api/mortality", catchAsync(async (req: express.Request, res: express.Response) => {
    const { flock_id, date, male_mortality, female_mortality, male_spot_cull, female_spot_cull, male_spent_cull, female_spent_cull, male_missex, female_missex, reported_by } = req.body;
    await MortalityRecord.create({ flock_id, date, male_mortality, female_mortality, male_spot_cull, female_spot_cull, male_spent_cull, female_spent_cull, male_missex, female_missex, reported_by });
    res.json({ success: true });
  }));

  app.post("/api/mortality/batch", catchAsync(async (req: express.Request, res: express.Response) => {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: "Records must be an array" });
    }
    await MortalityRecord.insertMany(records);
    res.json({ success: true });
  }));

  app.put("/api/mortality/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { flock_id, date, male_mortality, female_mortality, male_spot_cull, female_spot_cull, male_spent_cull, female_spent_cull, male_missex, female_missex, reported_by } = req.body;
    await MortalityRecord.findByIdAndUpdate(req.params.id, { flock_id, date, male_mortality, female_mortality, male_spot_cull, female_spot_cull, male_spent_cull, female_spent_cull, male_missex, female_missex, reported_by });
    res.json({ success: true });
  }));

  // Egg Production
  app.get("/api/eggs", catchAsync(async (req: express.Request, res: express.Response) => {
    const records = await EggProduction.find().populate("flock_id");
    
    // Fetch all relevant data for population calculation
    const allMortality = await MortalityRecord.find();
    const allTransfers = await FlockTransfer.find();

    const mapped = records.map(ep => {
      const obj = mapId(ep);
      const flock = ep.flock_id as any;
      obj.house_number = flock ? flock.house_number : null;
      
      const beginning_female = flock ? flock.beginning_female : 0;
      obj.beginning_female = beginning_female;

      // Calculate population at the end of the record date
      const recordDateStr = ep.date; // Use string comparison for simplicity if YYYY-MM-DD
      
      if (flock) {
        const mortalityUntilDate = allMortality
          .filter(m => m.flock_id && m.flock_id.toString() === flock._id.toString() && m.date <= recordDateStr)
          .reduce((sum, m) => sum + (m.female_mortality || 0) + (m.female_spot_cull || 0) + (m.female_spent_cull || 0) + (m.female_missex || 0), 0);
        
        const transfersInUntilDate = allTransfers
          .filter(t => t.to_flock_id && t.to_flock_id.toString() === flock._id.toString() && t.date <= recordDateStr)
          .reduce((sum, t) => sum + (t.female_count || 0), 0);
        
        const transfersOutUntilDate = allTransfers
          .filter(t => t.from_flock_id && t.from_flock_id.toString() === flock._id.toString() && t.date <= recordDateStr)
          .reduce((sum, t) => sum + (t.female_count || 0), 0);

        obj.actual_female_count = beginning_female + transfersInUntilDate - transfersOutUntilDate - mortalityUntilDate;
      } else {
        obj.actual_female_count = 0;
      }

      return obj;
    });
    res.json(mapped);
  }));

  app.post("/api/eggs", catchAsync(async (req: express.Request, res: express.Response) => {
    const { flock_id, date, hatching_eggs, he_floor_eggs, small, thin_shell, misshape, double_yolk, broken, spoiled, others, reported_by } = req.body;
    await EggProduction.create({ flock_id, date, hatching_eggs, he_floor_eggs, small, thin_shell, misshape, double_yolk, broken, spoiled, others, reported_by });
    res.json({ success: true });
  }));

  app.put("/api/eggs/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { flock_id, date, hatching_eggs, he_floor_eggs, small, thin_shell, misshape, double_yolk, broken, spoiled, others, reported_by } = req.body;
    await EggProduction.findByIdAndUpdate(req.params.id, { flock_id, date, hatching_eggs, he_floor_eggs, small, thin_shell, misshape, double_yolk, broken, spoiled, others, reported_by });
    res.json({ success: true });
  }));

  app.delete("/api/eggs/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    await EggProduction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }));

  // Medicine
  app.get("/api/medicine-types", catchAsync(async (req: express.Request, res: express.Response) => {
    let types = await MedicineType.find();
    if (types.length === 0) {
      await MedicineType.insertMany([{ name: "Medicine" }, { name: "Vaccine" }]);
      types = await MedicineType.find();
    }
    res.json(types.map(mapId));
  }));

  app.post("/api/medicine-types", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name } = req.body;
    await MedicineType.create({ name });
    res.json({ success: true });
  }));

  app.get("/api/medicine-inventory", catchAsync(async (req: express.Request, res: express.Response) => {
    const inventory = await MedicineInventory.find().populate("type_id");
    const mapped = inventory.map(mi => {
      const obj = mapId(mi);
      if (mi.type_id) {
        obj.type = (mi.type_id as any).name;
      }
      return obj;
    });
    res.json(mapped);
  }));

  app.get("/api/medicine-administration", catchAsync(async (req: express.Request, res: express.Response) => {
    const history = await MedicineAdministration.find()
      .populate("medicine_id")
      .populate("flock_id");
    const mapped = history.map(ma => {
      const obj = mapId(ma);
      obj.medicine_name = ma.medicine_id ? (ma.medicine_id as any).name : null;
      obj.house_number = ma.flock_id ? (ma.flock_id as any).house_number : null;
      return obj;
    });
    res.json(mapped);
  }));

  app.get("/api/medicine-incoming", catchAsync(async (req: express.Request, res: express.Response) => {
    const history = await MedicineIncoming.find().populate("medicine_id");
    const mapped = history.map(mi => {
      const obj = mapId(mi);
      obj.medicine_name = mi.medicine_id ? (mi.medicine_id as any).name : null;
      return obj;
    });
    res.json(mapped);
  }));

  app.post("/api/medicine-inventory", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, type_id, manufacturer, expiration_date, image_url, stock_quantity, unit_type, capacity_per_unit } = req.body;
    // For backward compatibility, we might still receive 'type' as string or we use type_id
    const mi = await MedicineInventory.create({ 
      name, 
      type_id, 
      manufacturer, 
      expiration_date, 
      image_url, 
      stock_quantity,
      unit_type: unit_type || "Vial",
      capacity_per_unit: capacity_per_unit || 1000
    });
    
    // Also log as incoming if initial stock > 0
    if (stock_quantity > 0) {
      await MedicineIncoming.create({
        medicine_id: mi._id,
        quantity: stock_quantity,
        date: new Date().toISOString().split('T')[0],
        notes: "Initial stock"
      });
    }
    
    res.json({ success: true });
  }));

  app.put("/api/medicine-inventory/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, type_id, manufacturer, expiration_date, image_url, stock_quantity, unit_type, capacity_per_unit } = req.body;
    await MedicineInventory.findByIdAndUpdate(req.params.id, {
      name,
      type_id,
      manufacturer,
      expiration_date,
      image_url,
      stock_quantity,
      unit_type: unit_type || "Vial",
      capacity_per_unit: capacity_per_unit || 1000
    });
    res.json({ success: true });
  }));

  app.delete("/api/medicine-inventory/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    await MedicineInventory.findByIdAndDelete(req.params.id);
    // Delete associated incoming & administration history
    await MedicineIncoming.deleteMany({ medicine_id: req.params.id });
    await MedicineAdministration.deleteMany({ medicine_id: req.params.id });
    res.json({ success: true });
  }));

  app.post("/api/medicine-incoming", catchAsync(async (req: express.Request, res: express.Response) => {
    const { medicine_id, quantity, date, notes } = req.body;
    await MedicineIncoming.create({ medicine_id, quantity, date, notes });
    await MedicineInventory.findByIdAndUpdate(medicine_id, { $inc: { stock_quantity: quantity } });
    res.json({ success: true });
  }));

  app.post("/api/medicine-administration", catchAsync(async (req: express.Request, res: express.Response) => {
    const { medicine_id, flock_id, date, method, peripherals, peripheral_quantity, quantity } = req.body;
    await MedicineAdministration.create({ medicine_id, flock_id, date, method, peripherals, peripheral_quantity: peripheral_quantity || 0, quantity });
    await MedicineInventory.findByIdAndUpdate(medicine_id, { $inc: { stock_quantity: -quantity } });
    res.json({ success: true });
  }));

  // Treatment Plans APIs (Vaccination and medication programs)
  const defaultTreatmentPlans = [
    {
      name: "ND + IB Vaccine (Newcastle + Infectious Bronchitis)",
      category: "Vaccine",
      ageDays: 1,
      dosage: "1 dose / bird",
      dosageValue: 1,
      dosageUnit: "dose",
      method: "Intraocular / Eye Drop",
      diseases: "Newcastle Disease, Infectious Bronchitis",
      description: "Primary immunization for flock protection on emergence.",
      details: "Essential first-day defense. Usually administered via spray or direct eye drops."
    },
    {
      name: "Marek's Disease Vaccine",
      category: "Vaccine",
      ageDays: 1,
      dosage: "0.2 mL / bird",
      dosageValue: 0.2,
      dosageUnit: "mL",
      method: "Subcutaneous Injection",
      diseases: "Marek's Disease",
      description: "Subcutaneous injection administered at hatchery.",
      details: "Protects against Marek's paralysis. Must be kept deeply frozen until reconstituted."
    },
    {
      name: "Infectious Bursal Disease (Gumboro) Vaccine",
      category: "Vaccine",
      ageDays: 12,
      dosage: "1 dose / bird",
      dosageValue: 1,
      dosageUnit: "dose",
      method: "Drinking Water",
      diseases: "Gumboro (IBD)",
      description: "Initial Gumboro drinking water vaccine.",
      details: "Requires withholding water for 1-2 hours prior to ensure active drinking of the treated water."
    },
    {
      name: "Amprolium / Coccidiostat Course",
      category: "Medicine",
      ageDays: 18,
      dosage: "1.2 g / Liter of water",
      dosageValue: 1.2,
      dosageUnit: "g/L",
      method: "Drinking Water",
      diseases: "Coccidiosis prevention",
      description: "Preventative medicine course as chicks begin bedding contact.",
      details: "Coccidiosis spreads via wet litter. Apply 5-day continuous drinking water treat."
    },
    {
      name: "ND + IB Booster",
      category: "Vaccine",
      ageDays: 21,
      dosage: "1 dose / bird",
      dosageValue: 1,
      dosageUnit: "dose",
      method: "Drinking Water",
      diseases: "Newcastle Disease, Infectious Bronchitis",
      description: "Secondary booster to prolong active antibody titers.",
      details: "Boosts respiratory immunity as maternal antibody counts decline."
    },
    {
      name: "Multivitamin AD3E + B-Complex Boost",
      category: "Supplement",
      ageDays: 28,
      dosage: "0.5 mL / Liter of water",
      dosageValue: 0.5,
      dosageUnit: "mL/L",
      method: "Drinking Water",
      diseases: "Growth Stress, Immune Support",
      description: "General vitamin replenishment with stress course.",
      details: "Helps skeleton growth and nutrient absorption during high development rate."
    },
    {
      name: "Fowl Pox Vaccine",
      category: "Vaccine",
      ageDays: 42,
      dosage: "1 dose / bird",
      dosageValue: 1,
      dosageUnit: "dose",
      method: "Wing-Web Puncture",
      diseases: "Avian Fowl Pox",
      description: "Wing-web skin puncture vaccine.",
      details: "Provides lifelong immunity against fowl pox. Requires check for 'takes' (lesions) after 7 days."
    },
    {
      name: "Levamisole Dewormer",
      category: "Medicine",
      ageDays: 56,
      dosage: "0.4 g / Liter of water",
      dosageValue: 0.4,
      dosageUnit: "g/L",
      method: "Drinking Water",
      diseases: "Internal Parasites / Worms",
      description: "Broad-spectrum roundworm treatment.",
      details: "Purges active intestinal worm populations. Highly recommended prior to laying onset."
    },
    {
      name: "Calcium & Electrolyte Forte",
      category: "Supplement",
      ageDays: 112,
      dosage: "2 g / Liter of water",
      dosageValue: 2,
      dosageUnit: "g/L",
      method: "Drinking Water",
      diseases: "Egg Shell Thickness pre-lay support",
      description: "Heavy calcium booster course to prep pullets for laying.",
      details: "Strengthens medullary bone reserves prior to production phase."
    }
  ];

  app.get("/api/treatment-plans", catchAsync(async (req: express.Request, res: express.Response) => {
    let plans = await TreatmentPlan.find();
    if (plans.length === 0) {
      await TreatmentPlan.insertMany(defaultTreatmentPlans);
      plans = await TreatmentPlan.find();
    }
    res.json(plans.map(mapId));
  }));

  app.post("/api/treatment-plans", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, category, ageDays, dosage, dosageValue, dosageUnit, method, diseases, description, details } = req.body;
    const plan = await TreatmentPlan.create({ name, category, ageDays, dosage, dosageValue, dosageUnit, method, diseases, description, details });
    res.json(mapId(plan));
  }));

  app.put("/api/treatment-plans/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, category, ageDays, dosage, dosageValue, dosageUnit, method, diseases, description, details } = req.body;
    await TreatmentPlan.findByIdAndUpdate(req.params.id, { name, category, ageDays, dosage, dosageValue, dosageUnit, method, diseases, description, details });
    res.json({ success: true });
  }));

  app.delete("/api/treatment-plans/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    await TreatmentPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }));

  // Employees
  app.get("/api/employees", catchAsync(async (req: express.Request, res: express.Response) => {
    const employees = await Employee.find();
    res.json(employees.map(mapId));
  }));

  app.post("/api/employees", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, birthday, address, contact_no, email, date_hired, position, image_url } = req.body;
    
    // Auto-generate sequential employee ID
    const count = await Employee.countDocuments();
    const employee_id_no = `EMP-${(count + 1).toString().padStart(4, '0')}`;
    
    await Employee.create({ employee_id_no, name, birthday, address, contact_no, email, date_hired, position, image_url });
    res.json({ success: true });
  }));

  app.put("/api/employees/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    const { name, birthday, address, contact_no, email, date_hired, position, resignation_date, image_url } = req.body;
    await Employee.findByIdAndUpdate(req.params.id, { name, birthday, address, contact_no, email, date_hired, position, resignation_date, image_url });
    res.json({ success: true });
  }));

  app.delete("/api/employees/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    await Employee.findByIdAndDelete(req.params.id);
    await DailyTimeRecord.deleteMany({ employee_id: req.params.id });
    res.json({ success: true });
  }));

  // Daily Time Record (DTR) Routes
  app.get("/api/dtr", catchAsync(async (req: express.Request, res: express.Response) => {
    const { date, employee_id, startDate, endDate } = req.query;
    const filter: any = {};
    if (date) filter.date = date;
    if (employee_id) filter.employee_id = employee_id;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const records = await DailyTimeRecord.find(filter).populate("employee_id");
    res.json(records.map(doc => {
      const obj = doc.toObject();
      return {
        id: obj._id.toString(),
        employee_id: obj.employee_id ? mapId(obj.employee_id) : null,
        date: obj.date,
        time_in: obj.time_in,
        time_out: obj.time_out,
        time_in_photo: obj.time_in_photo,
        time_out_photo: obj.time_out_photo,
        time_in_verification_confidence: obj.time_in_verification_confidence,
        time_out_verification_confidence: obj.time_out_verification_confidence,
        status: obj.status,
        notes: obj.notes
      };
    }));
  }));

  // Facial Recognition Verification & Clock-In / Clock-Out
  app.post("/api/dtr/verify-face", catchAsync(async (req: express.Request, res: express.Response) => {
    const { captured_image, action, selected_employee_id } = req.body; // action: 'clock_in' | 'clock_out' | 'verify'

    if (!captured_image) {
      return res.status(400).json({ error: "Captured image is required for facial recognition." });
    }

    // Get active employees with photos
    const employees = await Employee.find({ 
      resignation_date: { $exists: false },
      image_url: { $exists: true, $ne: "" }
    });

    if (!employees || employees.length === 0) {
      return res.status(400).json({ 
        error: "No employee profile photos found in the database. Please make sure employees have photos uploaded in Staff Management." 
      });
    }

    // Prepare prompt parts for Gemini
    const imageParts: any[] = [];
    
    // Clean base64 strings
    const cleanCaptured = captured_image.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = captured_image.match(/^data:(image\/\w+);base64,/);
    const capturedMime = mimeMatch ? mimeMatch[1] : "image/jpeg";

    // If specific employee selected, filter list or put them first
    let candidateEmployees = employees;
    if (selected_employee_id) {
      candidateEmployees = employees.filter(e => e._id.toString() === selected_employee_id);
      if (candidateEmployees.length === 0) {
        candidateEmployees = employees;
      }
    }

    const employeeListContext = candidateEmployees.map(emp => ({
      id: emp._id.toString(),
      employee_id_no: emp.employee_id_no,
      name: emp.name,
      position: emp.position,
      has_photo: !!emp.image_url
    }));

    // Build multimodal prompt
    const contents: any[] = [
      {
        inlineData: {
          mimeType: capturedMime,
          data: cleanCaptured
        }
      }
    ];

    // Add candidate employee photos
    candidateEmployees.forEach((emp, index) => {
      if (emp.image_url && emp.image_url.startsWith("data:image")) {
        const cleanEmpPhoto = emp.image_url.replace(/^data:image\/\w+;base64,/, "");
        const empMimeMatch = emp.image_url.match(/^data:(image\/\w+);base64,/);
        const empMime = empMimeMatch ? empMimeMatch[1] : "image/jpeg";
        contents.push({
          inlineData: {
            mimeType: empMime,
            data: cleanEmpPhoto
          }
        });
      }
    });

    const promptText = `
You are an advanced biometric facial recognition agent for employee attendance (Daily Time Record).
Image 1 is the live captured webcam image of an employee attempting to clock in/out.
${candidateEmployees.map((emp, i) => `Image ${i + 2} is the reference profile photo for Employee: ${emp.name} (ID: ${emp.employee_id_no}, DB ID: ${emp._id.toString()}).`).join("\n")}

Task:
Compare Image 1 (live capture) against each candidate reference photo.
Determine if Image 1 matches any employee in the reference photos with reasonable facial similarity (accounting for lighting, camera angle, minor expressions, glasses).
Return a JSON object:
{
  "matched": boolean,
  "matched_employee_id": string (the exact DB ID of the matched employee, or null if no match),
  "employee_name": string (name of matched employee or null),
  "confidence_percentage": number (0 to 100 confidence score),
  "reason": string (brief explanation of visual verification match result)
}
If no employee strongly matches or confidence is below 60%, set "matched": false and "matched_employee_id": null.
`;

    contents.push({ text: promptText });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: contents },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matched: { type: Type.BOOLEAN },
              matched_employee_id: { type: Type.STRING },
              employee_name: { type: Type.STRING },
              confidence_percentage: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ["matched", "confidence_percentage", "reason"]
          }
        }
      });

      const resultText = response.text ? response.text.trim() : "{}";
      const result = JSON.parse(resultText);

      if (!result.matched || !result.matched_employee_id || result.confidence_percentage < 60) {
        return res.status(400).json({
          matched: false,
          confidence_percentage: result.confidence_percentage || 0,
          reason: result.reason || "Facial recognition match confidence was too low. Please ensure your face is clearly visible in well-lit conditions."
        });
      }

      // Match succeeded! Find the matched employee
      const matchedEmployee = await Employee.findById(result.matched_employee_id);
      if (!matchedEmployee) {
        return res.status(404).json({ error: "Matched employee profile not found." });
      }

      const now = new Date();
      // Format current local date YYYY-MM-DD and time HH:mm:ss
      const localDate = now.toISOString().split("T")[0];
      const localTime = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Check if DTR entry exists for today
      let dtr = await DailyTimeRecord.findOne({
        employee_id: matchedEmployee._id,
        date: localDate
      });

      let clockAction: "time_in" | "time_out" = "time_in";

      if (action === "clock_out" || (dtr && dtr.time_in && !dtr.time_out)) {
        clockAction = "time_out";
      }

      if (clockAction === "time_in") {
        if (dtr && dtr.time_in && dtr.time_out) {
          return res.status(400).json({
            error: `${matchedEmployee.name} has already completed Time-In and Time-Out for today (${localDate}).`
          });
        }

        if (!dtr) {
          dtr = new DailyTimeRecord({
            employee_id: matchedEmployee._id,
            date: localDate,
            time_in: localTime,
            time_in_photo: captured_image,
            time_in_verification_confidence: result.confidence_percentage,
            status: "present"
          });
        } else {
          dtr.time_in = localTime;
          dtr.time_in_photo = captured_image;
          dtr.time_in_verification_confidence = result.confidence_percentage;
        }
        await dtr.save();
      } else {
        // Clock out
        if (!dtr || !dtr.time_in) {
          return res.status(400).json({
            error: `Cannot clock out. No Time-In record found for ${matchedEmployee.name} today (${localDate}).`
          });
        }

        dtr.time_out = localTime;
        dtr.time_out_photo = captured_image;
        dtr.time_out_verification_confidence = result.confidence_percentage;
        dtr.status = "completed";
        await dtr.save();
      }

      const updatedDtr = await DailyTimeRecord.findById(dtr._id).populate("employee_id");

      res.json({
        success: true,
        action: clockAction,
        time: localTime,
        date: localDate,
        confidence: result.confidence_percentage,
        reason: result.reason,
        employee: mapId(matchedEmployee),
        dtr: updatedDtr ? {
          id: updatedDtr._id.toString(),
          employee_id: mapId(matchedEmployee),
          date: updatedDtr.date,
          time_in: updatedDtr.time_in,
          time_out: updatedDtr.time_out,
          status: updatedDtr.status
        } : null
      });

    } catch (err: any) {
      console.error("Error in facial recognition API:", err);
      res.status(500).json({ 
        error: "Facial recognition analysis failed: " + (err.message || "Unknown error")
      });
    }
  }));

  // Manual DTR Creation / Editing Endpoint (for admins/managers)
  app.post("/api/dtr/manual", catchAsync(async (req: express.Request, res: express.Response) => {
    const { employee_id, date, time_in, time_out, status, notes } = req.body;
    if (!employee_id || !date) {
      return res.status(400).json({ error: "Employee and date are required." });
    }

    let dtr = await DailyTimeRecord.findOne({ employee_id, date });
    if (dtr) {
      if (time_in !== undefined) dtr.time_in = time_in;
      if (time_out !== undefined) dtr.time_out = time_out;
      if (status !== undefined) dtr.status = status;
      if (notes !== undefined) dtr.notes = notes;
      await dtr.save();
    } else {
      dtr = await DailyTimeRecord.create({
        employee_id,
        date,
        time_in,
        time_out,
        status: status || (time_out ? "completed" : "present"),
        notes
      });
    }

    const populated = await DailyTimeRecord.findById(dtr._id).populate("employee_id");
    res.json({ success: true, dtr: populated });
  }));

  app.delete("/api/dtr/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    await DailyTimeRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }));

  // Settings
  app.get("/api/users", catchAsync(async (req: express.Request, res: express.Response) => {
    const users = await User.find({}, "username role full_name assigned_flock_id");
    res.json(users.map(mapId));
  }));

  app.put("/api/users/:id/role", catchAsync(async (req: express.Request, res: express.Response) => {
    const { role, assigned_flock_id } = req.body;
    await User.findByIdAndUpdate(req.params.id, { role, assigned_flock_id });
    res.json({ success: true });
  }));

  app.delete("/api/users/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }));

  // Password Reset Requests
  app.post("/api/password-reset-request", catchAsync(async (req: express.Request, res: express.Response) => {
    const { username, newPassword } = req.body;
    
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "Username not found" });
    }

    // Check if there is already a pending request for this user
    const existing = await PasswordResetRequest.findOne({ username: username.toLowerCase(), status: "pending" });
    if (existing) {
      return res.status(400).json({ success: false, message: "A request is already pending for this user." });
    }

    await PasswordResetRequest.create({
      username: user.username,
      full_name: user.full_name,
      new_password: newPassword, // Store plain text initially, will hash on approval
      status: "pending"
    });

    res.json({ success: true, message: "Password reset request submitted for admin approval." });
  }));

  app.get("/api/password-reset-requests", catchAsync(async (req: express.Request, res: express.Response) => {
    const requests = await PasswordResetRequest.find({ status: "pending" }).sort({ created_at: -1 });
    res.json(requests.map(mapId));
  }));

  app.post("/api/password-reset-requests/:id/approve", catchAsync(async (req: express.Request, res: express.Response) => {
    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const hashedPassword = await bcrypt.hash(request.new_password, 10);
    await User.findOneAndUpdate({ username: request.username }, { password: hashedPassword });
    
    request.status = "approved";
    await request.save();

    res.json({ success: true });
  }));

  app.post("/api/password-reset-requests/:id/reject", catchAsync(async (req: express.Request, res: express.Response) => {
    await PasswordResetRequest.findByIdAndUpdate(req.params.id, { status: "rejected" });
    res.json({ success: true });
  }));

  app.get("/api/weight-standards", catchAsync(async (req: express.Request, res: express.Response) => {
    const standards = await WeightStandard.find().sort({ breed: 1, week: 1 });
    res.json(standards);
  }));

  app.post("/api/weight-standards", catchAsync(async (req: express.Request, res: express.Response) => {
    const { breed, week, standard_weight_male, standard_weight_female } = req.body;
    await WeightStandard.findOneAndUpdate(
      { breed, week },
      { standard_weight_male: Number(standard_weight_male), standard_weight_female: Number(standard_weight_female) },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  }));

  app.post("/api/weight-standards/batch", catchAsync(async (req: express.Request, res: express.Response) => {
    const { breed, standards } = req.body;
    if (!breed || !Array.isArray(standards)) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    for (const s of standards) {
      await WeightStandard.findOneAndUpdate(
        { breed, week: Number(s.week) },
        { 
          standard_weight_male: Number(s.standard_weight_male), 
          standard_weight_female: Number(s.standard_weight_female) 
        },
        { upsert: true }
      );
    }
    res.json({ success: true });
  }));

  app.get("/api/weight-records", catchAsync(async (req: express.Request, res: express.Response) => {
    const records = await WeightRecord.find().populate("flock_id").sort({ week: -1, date: -1 });
    res.json(records);
  }));

  app.post("/api/weight-records", catchAsync(async (req: express.Request, res: express.Response) => {
    const { flock_id, week, actual_weight_male, actual_weight_female, date, reported_by } = req.body;
    await WeightRecord.findOneAndUpdate(
      { flock_id, week },
      { 
        actual_weight_male: Number(actual_weight_male), 
        actual_weight_female: Number(actual_weight_female), 
        date, 
        reported_by 
      },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  }));

  app.delete("/api/weight-records/:id", catchAsync(async (req: express.Request, res: express.Response) => {
    await WeightRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }));

  // Database Backup
  app.get("/api/backup", catchAsync(async (req: express.Request, res: express.Response) => {
    const [
      users, farmProfile, flocks, feedTypes, feedInventory, 
      feedIncoming, feedConsumption, mortality, eggs, 
      medicineInventory, medicineAdministration, employees, flockTransfers,
      medicineTypes, medicineIncoming, weightStandards, weightRecords, dtrRecords
    ] = await Promise.all([
      User.find(), // Include hashed passwords for lossless backup/restore
      FarmProfile.find(),
      Flock.find(),
      FeedType.find(),
      FeedInventory.find(),
      FeedIncoming.find(),
      FeedConsumption.find(),
      MortalityRecord.find(),
      EggProduction.find(),
      MedicineInventory.find(),
      MedicineAdministration.find(),
      Employee.find(),
      FlockTransfer.find(),
      MedicineType.find(),
      MedicineIncoming.find(),
      WeightStandard.find(),
      WeightRecord.find(),
      DailyTimeRecord.find()
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: "1.2.0",
      data: {
        users,
        farmProfile,
        flocks,
        feedTypes,
        feedInventory,
        feedIncoming,
        feedConsumption,
        mortality,
        eggs,
        medicineInventory,
        medicineAdministration,
        employees,
        flockTransfers,
        medicineTypes,
        medicineIncoming,
        weightStandards,
        weightRecords,
        dtrRecords
      }
    };

    res.json(backupData);
  }));

  // Database Restore
  app.post("/api/restore", catchAsync(async (req: express.Request, res: express.Response) => {
    const { data } = req.body;
    if (!data) return res.status(400).json({ success: false, message: "No data provided" });

    // Clear and restore each collection
    await Promise.all([
      User.deleteMany({}),
      FarmProfile.deleteMany({}),
      Flock.deleteMany({}),
      FeedType.deleteMany({}),
      FeedInventory.deleteMany({}),
      FeedIncoming.deleteMany({}),
      FeedConsumption.deleteMany({}),
      MortalityRecord.deleteMany({}),
      EggProduction.deleteMany({}),
      MedicineInventory.deleteMany({}),
      MedicineAdministration.deleteMany({}),
      Employee.deleteMany({}),
      FlockTransfer.deleteMany({}),
      MedicineType.deleteMany({}),
      MedicineIncoming.deleteMany({}),
      WeightStandard.deleteMany({}),
      WeightRecord.deleteMany({}),
      DailyTimeRecord.deleteMany({})
    ]);

    await Promise.all([
      data.users && data.users.length > 0 ? User.insertMany(data.users) : Promise.resolve(),
      data.farmProfile && data.farmProfile.length > 0 ? FarmProfile.insertMany(data.farmProfile) : Promise.resolve(),
      data.flocks && data.flocks.length > 0 ? Flock.insertMany(data.flocks) : Promise.resolve(),
      data.feedTypes && data.feedTypes.length > 0 ? FeedType.insertMany(data.feedTypes) : Promise.resolve(),
      data.feedInventory && data.feedInventory.length > 0 ? FeedInventory.insertMany(data.feedInventory) : Promise.resolve(),
      data.feedIncoming && data.feedIncoming.length > 0 ? FeedIncoming.insertMany(data.feedIncoming) : Promise.resolve(),
      data.feedConsumption && data.feedConsumption.length > 0 ? FeedConsumption.insertMany(data.feedConsumption) : Promise.resolve(),
      data.mortality && data.mortality.length > 0 ? MortalityRecord.insertMany(data.mortality) : Promise.resolve(),
      data.eggs && data.eggs.length > 0 ? EggProduction.insertMany(data.eggs) : Promise.resolve(),
      data.medicineInventory && data.medicineInventory.length > 0 ? MedicineInventory.insertMany(data.medicineInventory) : Promise.resolve(),
      data.medicineAdministration && data.medicineAdministration.length > 0 ? MedicineAdministration.insertMany(data.medicineAdministration) : Promise.resolve(),
      data.employees && data.employees.length > 0 ? Employee.insertMany(data.employees) : Promise.resolve(),
      data.flockTransfers && data.flockTransfers.length > 0 ? FlockTransfer.insertMany(data.flockTransfers) : Promise.resolve(),
      data.medicineTypes && data.medicineTypes.length > 0 ? MedicineType.insertMany(data.medicineTypes) : Promise.resolve(),
      data.medicineIncoming && data.medicineIncoming.length > 0 ? MedicineIncoming.insertMany(data.medicineIncoming) : Promise.resolve(),
      data.weightStandards && data.weightStandards.length > 0 ? WeightStandard.insertMany(data.weightStandards) : Promise.resolve(),
      data.weightRecords && data.weightRecords.length > 0 ? WeightRecord.insertMany(data.weightRecords) : Promise.resolve(),
      data.dtrRecords && data.dtrRecords.length > 0 ? DailyTimeRecord.insertMany(data.dtrRecords) : Promise.resolve()
    ]);

    res.json({ success: true, message: "Database restored successfully" });
  }));

  // 404 handler for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server Error:", err);
    if (req.path.startsWith("/api")) {
      return res.status(500).json({ 
        success: false, 
        message: "Internal server error", 
        error: err.message 
      });
    }
    // For non-API routes, just send a generic error or let Vite handle it
    res.status(500).send("Internal Server Error");
  });
}

startServer();
