import express from "express";
import { ObjectId } from "mongodb";
import { verifyToken, verifyRenter } from "../middleware/auth.js";

const router = express.Router();

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

  return router;
}
