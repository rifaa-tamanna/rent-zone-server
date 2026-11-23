import express from "express";
import { ObjectId } from "mongodb";
import { verifyToken, verifyRenter } from "../middleware/auth.js";
import multer from "multer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

export default function customerRoutes({
  favoritesCollection,
  equipmentCollection,
  bookingsCollection,
  usersCollection,
}) {
  // ==========================================
  // FAVORITES
  // ==========================================

  // GET: Fetch all saved favorites for logged-in user
  router.get("/favorites", verifyToken, async (req, res, next) => {
    try {
      const favorites = await favoritesCollection
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray();

      // Fetch equipment details for each favorite item
      const equipmentIds = favorites
        .map((f) => {
          try {
            return new ObjectId(f.equipmentId);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const items = await equipmentCollection
        .find({ _id: { $in: equipmentIds } })
        .toArray();

      const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

      const enrichedFavorites = favorites.map((f) => ({
        ...f,
        equipment: itemMap.get(f.equipmentId) || null,
      }));

      return res.status(200).json({
        success: true,
        favorites: enrichedFavorites,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET: Check if an equipment is in favorites
  router.get("/favorites/check/:equipmentId", verifyToken, async (req, res, next) => {
    try {
      const { equipmentId } = req.params;

      const exists = await favoritesCollection.findOne({
        userId: req.user.id,
        equipmentId,
      });

      return res.status(200).json({
        success: true,
        isFavorite: Boolean(exists),
      });
    } catch (error) {
      next(error);
    }
  });

  // POST: Add equipment to favorites
  router.post("/favorites/:equipmentId", verifyToken, async (req, res, next) => {
    try {
      const { equipmentId } = req.params;

      if (!ObjectId.isValid(equipmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid equipment ID.",
        });
      }

      // Check if equipment exists
      const equipment = await equipmentCollection.findOne({
        _id: new ObjectId(equipmentId),
      });

      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: "Equipment not found.",
        });
      }

      // Check if already favorited
      const existing = await favoritesCollection.findOne({
        userId: req.user.id,
        equipmentId,
      });

      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Equipment already in your favorites.",
          favoriteId: existing._id,
        });
      }

      const newFavorite = {
        userId: req.user.id,
        userEmail: req.user.email,
        equipmentId,
        equipmentName: equipment.name,
        category: equipment.category,
        rentalPrice: equipment.rentalPrice,
        image: equipment.image,
        location: equipment.location,
        createdAt: new Date(),
      };

      const result = await favoritesCollection.insertOne(newFavorite);

      return res.status(201).json({
        success: true,
        message: "Added to favorites successfully.",
        favorite: { _id: result.insertedId, ...newFavorite },
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE: Remove equipment from favorites
  router.delete("/favorites/:equipmentId", verifyToken, async (req, res, next) => {
    try {
      const { equipmentId } = req.params;

      const result = await favoritesCollection.deleteOne({
        userId: req.user.id,
        equipmentId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Favorite not found or already removed.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Removed from favorites successfully.",
      });
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // CUSTOMER RENTALS / BOOKINGS
  // ==========================================

  // GET: Fetch all bookings for logged-in customer
  router.get("/rentals", verifyToken, async (req, res, next) => {
    try {
      const rentals = await bookingsCollection
        .find({ customerId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        rentals,
      });
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // USER PROFILE (Customer, Owner, Admin)
  // ==========================================

  // GET: Current user profile
  router.get("/profile", verifyToken, async (req, res, next) => {
    try {
      const user = await usersCollection.findOne(
        { email: req.user.email },
        {
          projection: {
            password: 0,
          },
        },
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User profile not found.",
        });
      }

      return res.status(200).json({
        success: true,
        profile: user,
      });
    } catch (error) {
      next(error);
    }
  });

  // PUT: Update current user profile
  router.put("/profile", verifyToken, async (req, res, next) => {
    try {
      const { name, image, phone, address } = req.body;

      const updateData = {};
      if (typeof name === "string" && name.trim()) {
        updateData.name = name.trim();
      }
      if (typeof image === "string" && image.trim()) {
        updateData.image = image.trim();
      }
      if (typeof phone === "string") {
        updateData.phone = phone.trim();
      }
      if (typeof address === "string") {
        updateData.address = address.trim();
      }

      updateData.updatedAt = new Date();

      await usersCollection.updateOne(
        { email: req.user.email },
        { $set: updateData },
      );

      const updatedUser = await usersCollection.findOne(
        { email: req.user.email },
        { projection: { password: 0 } },
      );

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        profile: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  });

  // POST: Upload Profile Image
  router.post(
    "/profile/image",
    verifyToken,
    upload.single("image"),
    async (req, res, next) => {
      try {
        // Check uploaded file
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "Please select an image.",
          });
        }

        // Check ImgBB API key
        const apiKey = process.env.IMGBB_API_KEY;

        if (!apiKey) {
          return res.status(500).json({
            success: false,
            message: "Image upload service is not configured.",
          });
        }

        // Convert image to Base64
        const formData = new URLSearchParams();

        formData.append("key", apiKey);
        formData.append("image", req.file.buffer.toString("base64"));

        // Upload to ImgBB
        const response = await fetch(
          "https://api.imgbb.com/1/upload",
          {
            method: "POST",
            body: formData,
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          console.error("ImgBB upload failed:", result);

          return res.status(502).json({
            success: false,
            message: "Failed to upload image to ImgBB.",
          });
        }

        const imageUrl = result.data.display_url || result.data.url;

        // Update MongoDB user profile
        const updateResult = await usersCollection.updateOne(
          { email: req.user.email },
          {
            $set: {
              image: imageUrl,
              updatedAt: new Date(),
            },
          },
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User profile not found.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Profile photo updated successfully.",
          image: imageUrl,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  // GET: Customer Dashboard Analytics
  router.get("/analytics", verifyToken, async (req, res, next) => {
    try {
      const [
        totalBookings,
        activeRentals,
        completedRentals,
        savedFavorites,
        payments,
      ] = await Promise.all([
        bookingsCollection.countDocuments({ customerId: req.user.id }),
        bookingsCollection.countDocuments({
          customerId: req.user.id,
          bookingStatus: { $in: ["confirmed", "active"] },
        }),
        bookingsCollection.countDocuments({
          customerId: req.user.id,
          bookingStatus: "completed",
        }),
        favoritesCollection.countDocuments({ userId: req.user.id }),
        paymentsCollection
          .find({ customerId: req.user.id, status: "succeeded" })
          .toArray(),
      ]);

      const totalSpent = payments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );

      return res.status(200).json({
        success: true,
        analytics: {
          totalBookings,
          activeRentals,
          completedRentals,
          savedFavorites,
          totalSpent,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
