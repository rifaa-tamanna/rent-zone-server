import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient } from "mongodb";
import ownerEquipmentRoutes from "./routes/ownerEquipmentRoutes.js";
import ownerImageRoutes from "./routes/ownerImageRoutes.js";
import publicEquipmentRoutes from "./routes/publicEquipmentRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import bookingPaymentRoutes from "./routes/bookingPaymentRoutes.js";

import { verifyToken, verifyAdmin } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(express.json());

const allowedOrigins = [
  "http://localhost:3000",
  process.env.BETTER_AUTH_BASE_URL,
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, health checks, or curl)
      if (!origin) return callback(null, true);

      // Allow Vercel preview and production domains
      const isVercel = /\.vercel\.app$/.test(origin);

      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*") ||
        isVercel
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

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
const bookings = database.collection("bookings");
const payments = database.collection("payments");
const favorites = database.collection("favorites");

// Public Equipment Routes (Search, Filter, Sort, Featured)
app.use(
  "/api/equipment",
  publicEquipmentRoutes({
    equipmentCollection: equipment,
  }),
);

// Owner Routes
app.use("/api/owner/images", ownerImageRoutes);
app.use(
  "/api/owner/equipment",
  ownerEquipmentRoutes({
    equipmentCollection: equipment,
    usersCollection: users,
  }),
);

// Customer Routes (Favorites, Rentals, Profile)
app.use(
  "/api/customer",
  customerRoutes({
    favoritesCollection: favorites,
    equipmentCollection: equipment,
    bookingsCollection: bookings,
    usersCollection: users,
  }),
);

// Booking & Payment Routes
app.use(
  "/api/bookings",
  bookingPaymentRoutes({
    bookingsCollection: bookings,
    paymentsCollection: payments,
    equipmentCollection: equipment,
    usersCollection: users,
  }),
);

// Admin Routes (Users, Equipment Moderation, Platform Analytics)
app.use(
  "/api/admin",
  adminRoutes({
    usersCollection: users,
    equipmentCollection: equipment,
    bookingsCollection: bookings,
    paymentsCollection: payments,
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

export default app;
