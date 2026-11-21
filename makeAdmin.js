import "dotenv/config";
import { MongoClient } from "mongodb";

const email = process.argv[2];

if (!email) {
  console.log("❌ Please provide an email address.");
  console.log("Usage: node makeAdmin.js <user-email>");
  console.log("Example: node makeAdmin.js user@example.com");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing in .env file!");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

async function promoteToAdmin() {
  try {
    await client.connect();
    const db = client.db("rent-zone");
    const usersCollection = db.collection("user");

    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log(`❌ No user found with email: "${email}"`);
      console.log("💡 Tip: First sign up with this email on http://localhost:3000/signup, then run this command again.");
      process.exit(1);
    }

    await usersCollection.updateOne(
      { email },
      { $set: { role: "admin", updatedAt: new Date() } }
    );

    console.log(`🎉 SUCCESS! The user "${email}" has been promoted to ADMIN.`);
    console.log(`👉 Please Sign Out and Sign In again on the website to refresh your JWT token.`);
    console.log(`🚀 Then navigate to: http://localhost:3000/dashboard/admin`);
  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    await client.close();
  }
}

promoteToAdmin();
