
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URl || "MISSING_MONGODB_URI";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "production";

// Define Schemas (Simplified for seeding)
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
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

const medicineTypeSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true }
});
const MedicineType = mongoose.model("MedicineType", medicineTypeSchema);

const medicineInventorySchema = new mongoose.Schema({
  name: String,
  type_id: { type: mongoose.Schema.Types.ObjectId, ref: "MedicineType" },
  type: String,
  manufacturer: String,
  expiration_date: String,
  image_url: String,
  stock_quantity: { type: Number, default: 0 }
});
const MedicineInventory = mongoose.model("MedicineInventory", medicineInventorySchema);

const weightStandardSchema = new mongoose.Schema({
  breed: { type: String, required: true },
  week: { type: Number, required: true },
  standard_weight_male: { type: Number, default: 0 },
  standard_weight_female: { type: Number, default: 0 }
});
const WeightStandard = mongoose.model("WeightStandard", weightStandardSchema);

const weightRecordSchema = new mongoose.Schema({
  flock_id: { type: mongoose.Schema.Types.ObjectId, ref: "Flock", required: true },
  week: { type: Number, required: true },
  actual_weight_male: { type: Number, default: 0 },
  actual_weight_female: { type: Number, default: 0 },
  date: String,
  reported_by: String
});
const WeightRecord = mongoose.model("WeightRecord", weightRecordSchema);

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

async function seed() {
  let uri = MONGODB_URI.trim();
  if (uri.includes("?")) {
    const [base, query] = uri.split("?");
    const params = query.split("&");
    const validParams = params.filter(p => p.includes("=") && !p.includes(" "));
    uri = base + (validParams.length > 0 ? "?" + validParams.join("&") : "");
  }
  uri = uri.replace(/\s/g, "");
  
  if (uri === "MISSING_MONGODB_URI") {
    console.error("MONGODB_URI is missing");
    return;
  }

  await mongoose.connect(uri, { dbName: MONGODB_DB_NAME });
  console.log("Connected for seeding...");

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  console.log("Cleaning collections...");
  const cleanup = collectionNames.map(name => {
    return db.collection(name).deleteMany({});
  });
  await Promise.all(cleanup);

  // 1. Farm Profile
  console.log("Seeding farm profile...");
  await FarmProfile.create({
    name: "Golden Feather Poultry",
    address: "Purok 5, Brgy. San Jose, Malaybalay City, Bukidnon",
    logo_url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=200&h=200"
  });

  // 2. Employees
  console.log("Seeding employees...");
  const employees = await Employee.insertMany([
    { employee_id_no: "EMP-0001", name: "Ricardo Santos", birthday: "1985-04-12", address: "Malaybalay", contact_no: "0917-123-4567", email: "ricardo@farmflow.pro", date_hired: "2020-01-05", position: "Farm Manager", image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" },
    { employee_id_no: "EMP-0002", name: "Maria Garcia", birthday: "1992-09-25", address: "Valencia", contact_no: "0922-987-6543", email: "maria@farmflow.pro", date_hired: "2021-03-15", position: "Egg Collector", image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200" },
    { employee_id_no: "EMP-0003", name: "Bernardo Silva", birthday: "1988-11-20", address: "Lantapan", contact_no: "0905-111-2222", email: "bernardo@farmflow.pro", date_hired: "2022-06-10", position: "Flock Man", image_url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200" }
  ]);

  // 3. Admin & User
  console.log("Seeding users...");
  const adminPassword = await bcrypt.hash("FarmFlowAdmin2026!", 10);
  const workerPassword = await bcrypt.hash("worker123", 10);
  
  await User.create({
    username: "admin",
    password: adminPassword,
    role: "admin",
    full_name: "Ricardo Santos"
  });

  await User.create({
    username: "worker",
    password: workerPassword,
    role: "worker",
    full_name: "Bernardo Silva"
  });

  // 4. Flocks
  console.log("Seeding flocks...");
  const today = new Date();
  const date4MonthsAgo = new Date();
  date4MonthsAgo.setMonth(today.getMonth() - 4);
  const date2MonthsAgo = new Date();
  date2MonthsAgo.setMonth(today.getMonth() - 2);

  const flocks = await Flock.insertMany([
    { house_number: "H01", beginning_male: 380, beginning_female: 4200, loading_date: date4MonthsAgo.toISOString().split('T')[0], breed: "Cobb", status: "active" },
    { house_number: "H02", beginning_male: 450, beginning_female: 5000, loading_date: date2MonthsAgo.toISOString().split('T')[0], breed: "Ross", status: "active" },
    { house_number: "H03", beginning_male: 400, beginning_female: 4500, loading_date: today.toISOString().split('T')[0], breed: "Cobb", status: "active" }
  ]);

  // 5. Feed
  console.log("Seeding feed...");
  const ft1 = await FeedType.create({ name: "CSC1", category: "Starter" });
  const ft2 = await FeedType.create({ name: "CSC2", category: "Grower" });
  const ft3 = await FeedType.create({ name: "CBB1", category: "Breeder" });

  await FeedInventory.insertMany([
    { feed_type_id: ft1._id, beginning_stock: 5000, current_stock: 4250 },
    { feed_type_id: ft2._id, beginning_stock: 8000, current_stock: 7100 },
    { feed_type_id: ft3._id, beginning_stock: 15000, current_stock: 12400 }
  ]);

  // 6. Mortality Records (last 5 days)
  console.log("Seeding mortality...");
  const mortalityData = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    mortalityData.push({
      flock_id: flocks[0]._id,
      date: dateStr,
      male_mortality: Math.floor(Math.random() * 2),
      female_mortality: Math.floor(Math.random() * 5),
      reported_by: "Bernardo Silva"
    });
    mortalityData.push({
      flock_id: flocks[1]._id,
      date: dateStr,
      male_mortality: Math.floor(Math.random() * 2),
      female_mortality: Math.floor(Math.random() * 3),
      reported_by: "Ricardo Santos"
    });
  }
  await MortalityRecord.insertMany(mortalityData);

  // 7. Egg Production (last 5 days)
  console.log("Seeding egg production...");
  const eggData = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    eggData.push({
      flock_id: flocks[0]._id,
      date: dateStr,
      hatching_eggs: 3200 + Math.floor(Math.random() * 200),
      small: 80 + Math.floor(Math.random() * 20),
      broken: 15 + Math.floor(Math.random() * 10),
      reported_by: "Maria Garcia"
    });
    eggData.push({
      flock_id: flocks[1]._id,
      date: dateStr,
      hatching_eggs: 4100 + Math.floor(Math.random() * 150),
      small: 110 + Math.floor(Math.random() * 30),
      broken: 25 + Math.floor(Math.random() * 15),
      reported_by: "Maria Garcia"
    });
  }
  await EggProduction.insertMany(eggData);

  // 8. Weight Standards
  console.log("Seeding weight standards...");
  const standards = [];
  for (let w = 1; w <= 65; w++) {
    standards.push({
      breed: "Cobb",
      week: w,
      standard_weight_male: 100 + (w * 80) + Math.sin(w/5) * 50,
      standard_weight_female: 90 + (w * 65) + Math.sin(w/5) * 40
    });
    standards.push({
      breed: "Ross",
      week: w,
      standard_weight_male: 105 + (w * 82) + Math.sin(w/6) * 55,
      standard_weight_female: 95 + (w * 67) + Math.sin(w/6) * 45
    });
  }
  await WeightStandard.insertMany(standards);

  // 9. Medicine
  console.log("Seeding medicine...");
  const mt1 = await MedicineType.create({ name: "Antibiotic" });
  const mt2 = await MedicineType.create({ name: "Vaccine" });
  const mt3 = await MedicineType.create({ name: "Vitamin" });
  
  await MedicineInventory.insertMany([
    { name: "Amoxicillin 50%", type_id: mt1._id, manufacturer: "Pharma Poultry", expiration_date: "2027-12-31", stock_quantity: 50, type: "Antibiotic" },
    { name: "ND-IB Vaccine", type_id: mt2._id, manufacturer: "VaxLine", expiration_date: "2026-09-30", stock_quantity: 200, type: "Vaccine" },
    { name: "Electrolytes Plus", type_id: mt3._id, manufacturer: "AgriHealth", expiration_date: "2028-06-15", stock_quantity: 15, type: "Vitamin" }
  ]);

  // 10. Feed Transactions (Incoming & Consumption)
  console.log("Seeding feed transactions...");
  const date3DaysAgo = new Date();
  date3DaysAgo.setDate(today.getDate() - 3);

  await FeedIncoming.create({
    feed_type_id: ft3._id,
    date: date3DaysAgo.toISOString().split('T')[0],
    quantity_kg: 2000,
    notes: "Batch received from MegaFeeds"
  });

  await FeedConsumption.insertMany([
    {
      flock_id: flocks[0]._id,
      feed_type_male_id: ft3._id,
      feed_type_female_id: ft3._id,
      date: today.toISOString().split('T')[0],
      quantity_male_kg: 20,
      quantity_female_kg: 130,
      quantity_kg: 150
    },
    {
      flock_id: flocks[1]._id,
      feed_type_male_id: ft2._id,
      feed_type_female_id: ft2._id,
      date: today.toISOString().split('T')[0],
      quantity_male_kg: 15,
      quantity_female_kg: 105,
      quantity_kg: 120
    }
  ]);

  // 11. Weight Records
  console.log("Seeding weight records...");
  await WeightRecord.insertMany([
    {
      flock_id: flocks[0]._id,
      week: 8,
      date: date2MonthsAgo.toISOString().split('T')[0],
      actual_weight_male: 1200,
      actual_weight_female: 1100,
      reported_by: "Ricardo Santos"
    },
    {
      flock_id: flocks[1]._id,
      week: 4,
      date: today.toISOString().split('T')[0],
      actual_weight_male: 850,
      actual_weight_female: 780,
      reported_by: "Ricardo Santos"
    }
  ]);

  console.log("Seeding complete! Admin user: admin / FarmFlowAdmin2026!");
  mongoose.connection.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

