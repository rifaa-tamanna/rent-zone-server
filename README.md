# ⚙️ RentZone Server — Backend API

> **Platform:** Express.js, Node.js (ES Modules), MongoDB Native Driver, Jose JWT

---

## 📌 Purpose
The **RentZone Server** powers the RESTful API for the Equipment Rental Platform. It provides secure JWT token verification, role-based authorization middlewares, dynamic search & filtering, booking management, Stripe payment processing, and platform analytics.

### 🌟 Key Features
* **Role-Based Middlewares (Challenge 2):** `verifyToken`, `verifyRenter`, `verifyOwner`, and `verifyAdmin` enforcing granular authorization.
* **Server-Side Catalog Query (Challenge 1):** Regex-powered search, category/rental-type filtering, price range limits, and dynamic pagination.
* **ImgBB Multi-Image Upload:** Server-side handling of multipart file buffers via Multer and automated dispatch to ImgBB API.
* **Booking & Payments Collection:** Accurate duration calculation, inventory decrement, and transaction logs.
* **Dynamic Analytics Engine (Challenge 3):** Real-time aggregation of users, listings, bookings, and revenue for admin and owners.

---

## 🛠️ Dependencies & NPM Packages
* **Core:** `express`, `cors`, `dotenv`
* **Database:** `mongodb` (Native Node Driver)
* **Authentication & Crypto:** `jose` (JWT verification & Remote JWKS)
* **File Uploads:** `multer`

---

## 🔑 Environment Variables
Create a `.env` file inside `rent-zone-server/`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_BASE_URL=http://localhost:3000
IMGBB_API_KEY=your_imgbb_api_key
```

---

## 🚀 Getting Started
```bash
# Install dependencies
npm install

# Run the server
node index.js
```
The server will start listening on [http://localhost:5000](http://localhost:5000).
