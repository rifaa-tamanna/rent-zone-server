# RentZone Backend Server

The RentZone Backend Server is a RESTful API built with Node.js and Express.js. It handles authentication verification, equipment management, image uploads, and database operations for the RentZone equipment rental platform.

## Live API

**Backend URL:** https://rent-zone-server.vercel.app/

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Better Auth JWT
- JOSE
- Multer
- ImgBB API
- CORS
- dotenv

## Key Features

- RESTful API architecture
- MongoDB database integration
- JWT-based authentication verification
- Role-based authorization
- Protected API routes
- Owner-specific equipment management
- Create, read, update, and delete equipment listings
- Equipment image uploads using ImgBB
- Input validation and error handling
- Secure access control for protected endpoints

## API Modules

### Authentication
- Verify Better Auth JWT tokens
- Identify authenticated users
- Validate user roles
- Protect private API endpoints

### Equipment Management
- Retrieve equipment listings
- Retrieve featured equipment
- Add new equipment
- Update equipment information
- Delete equipment listings
- Retrieve equipment by owner

### Image Upload
- Upload equipment images to ImgBB
- Support multiple image uploads
- Validate image upload requests
- Return uploaded image URLs

## Database

**Database:** MongoDB

Main collections:

- `user` – Stores user information.
- `equipment` – Stores equipment listing information.
- `rents` – Stores rental-related information.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/rifaa-tamanna/rent-zone-server
```

### 2. Navigate to the Project

```bash
cd rent-zone-server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_BASE_URL=http://localhost:3000
IMGBB_API_KEY=
```

Never share or commit your actual environment variables or secret keys.

### 5. Run the Development Server

```bash
npm run dev
```

The server will run at:

```text
http://localhost:5000
```

## Project Structure

```text
rent-zone-server/
├── middleware/
│   └── auth.js
├── routes/
│   ├── ownerEquipmentRoutes.js
│   └── ownerImageRoutes.js
├── index.js
├── package.json
├── package-lock.json
└── .env
```

## Authentication & Security

- Better Auth JWT verification using JOSE
- Public and protected API routes
- Owner and admin role verification
- Authorization checks for owner-specific resources
- Secure image upload endpoints
- Environment-based configuration

## Frontend Integration

The backend API is connected to the RentZone frontend built with Next.js.

**Frontend:** https://rentt-zone.vercel.app/

**Backend:** https://rent-zone-server.vercel.app/

## Author

**rifaa-tamanna**

---

*RentZone – Making Equipment Rental Simple and Accessible.*
