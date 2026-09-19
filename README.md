<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# FarmFlow - Poultry Farm Management System

Full-stack Poultry Farm Management Application with MongoDB persistence, flock tracking, egg production logs, feed inventory, mortality monitoring, and AI-assisted insights.

---

## Prerequisites

- **Node.js**: v18 or newer
- **MongoDB**: A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or local MongoDB instance)

---

## 🚀 Quick Setup Guide

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` or `.env` file in the root directory (you can copy `.env.example`):

```bash
cp .env.example .env.local
```

Fill in your connection details:

```env
# MongoDB Atlas Connection String
# Example: mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/farm_management?retryWrites=true&w=majority
MONGODB_URI=your_mongodb_connection_string_here

# Database Name (defaults to farm_management if omitted)
MONGODB_DB_NAME=farm_management

# Optional: Gemini API Key for AI Assistant features
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Important MongoDB Atlas Settings:**
> 1. **Network Access**: Go to **Network Access** in your MongoDB Atlas dashboard, click **Add IP Address**, and select **Allow Access from Anywhere** (`0.0.0.0/0`). This is required so Cloud Run, local machines, or cloud hosting can reach the database.
> 2. **Database User**: Go to **Database Access** and verify your user has read and write privileges (`readWriteAnyDatabase@admin` or `Atlas admin`).
> 3. **Special Characters in Password**: If your password contains characters like `@`, `:`, `/`, or `%`, make sure to URL-encode them, and do not leave `<` or `>` around the password.

### 3. Verify Database Connection

Run the built-in diagnostic test to ensure your MongoDB cluster is reachable and verify existing collections:

```bash
npm run db:check
```

### 4. (Optional) Seed Sample Demo Data

To populate sample flocks, feeds, medicines, egg productions, and employees:

```bash
npm run db:seed
```

> **Default Admin Account:**
> - **Username**: `admin`
> - **Password**: `FarmFlowAdmin2026!`

### 5. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Starts backend Express server + Vite frontend on port 3000 |
| **Build** | `npm run build` | Builds static assets and bundles backend into `dist/server.cjs` |
| **Production** | `npm run start` | Launches production server from `dist/server.cjs` |
| **Check DB** | `npm run db:check` | Tests MongoDB connection and lists all collections and document counts |
| **Seed DB** | `npm run db:seed` | Populates sample flock records, feed inventory, and test data |
| **Lint** | `npm run lint` | Runs TypeScript type checking |
