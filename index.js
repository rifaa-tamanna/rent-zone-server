import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient } from "mongodb";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection URI
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

const connectedClient = await connectToMongoDB()
const database = connectedClient.db('rent-zone')
const users = database.collection('user')
const rents = database.collection('rents')


// Home API
app.get("/", (req, res) => {
  res.send("RentZone website is running fine!");
});

// All Email Get API
app.get('/users', async(req, res) => {
    const cursor = users.find({})
    const result = await cursor.toArray()
    res.send(result)
})

app.listen(PORT, () => {
  console.log(`RentZone app listening on port ${PORT}`);
});


