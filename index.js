import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient } from "mongodb";
import ownerEquipmentRoutes from "./routes/ownerEquipmentRoutes.js";
import ownerImageRoutes from "./routes/ownerImageRoutes.js";

import { verifyToken, verifyAdmin } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(cors());

// ==========================================
// MONGODB CONNECTION
// ==========================================

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("Successfully connected to MongoDB!");

    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

const connectedClient = await connectToMongoDB();

const database = connectedClient.db("rent-zone");

const users = database.collection("user");
const rents = database.collection("rents");
const equipment = database.collection("equipment");

app.use("/api/owner/images", ownerImageRoutes);
app.use(
  "/api/owner/equipment",
  ownerEquipmentRoutes({
    equipmentCollection: equipment,
    usersCollection: users,
  }),
);

// ==========================================
// PUBLIC API
// ==========================================

app.get("/", (req, res) => {
  res.send("RentZone website is running fine!");
});

// ==========================================
// AUTHENTICATION API
// ==========================================

// Get currently logged-in user
app.get("/api/me", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

// ==========================================
// ADMIN ONLY API
// ==========================================

// Get all registered users
app.get("/users", verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const result = await users
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            image: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("Backend error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`RentZone app listening on port ${PORT}`);
});
