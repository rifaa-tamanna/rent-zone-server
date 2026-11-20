import express from "express";

import { verifyToken, verifyOwner } from "../middleware/auth.js";

const router = express.Router();

export default function ownerEquipmentRoutes({
  equipmentCollection,
  usersCollection,
}) {
  // Add new equipment
  router.post("/", verifyToken, verifyOwner, async (req, res, next) => {
    try {
      const {
        name,
        description,
        category,
        location,
        rentalPrice,
        rentalTypes,
        availableQuantity,
        condition,
        brand,
        model,
        image,
        rentalTerms,
      } = req.body;

      // 1. Check required information
      if (
        !name ||
        !description ||
        !category ||
        !location ||
        !condition ||
        !brand ||
        !model ||
        !image
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required equipment information.",
        });
      }

      // 2. Check rental types
      const allowedTypes = ["daily", "weekly", "monthly"];

      if (
        !Array.isArray(rentalTypes) ||
        rentalTypes.length === 0 ||
        !rentalTypes.every((type) => allowedTypes.includes(type))
      ) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid rental type.",
        });
      }

      // 3. Check rental prices
      if (!rentalPrice || typeof rentalPrice !== "object") {
        return res.status(400).json({
          success: false,
          message: "Please provide rental prices.",
        });
      }

      for (const type of rentalTypes) {
        const price = Number(rentalPrice[type]);

        if (!Number.isFinite(price) || price <= 0) {
          return res.status(400).json({
            success: false,
            message: `Please provide a valid ${type} rental price.`,
          });
        }
      }

      // 4. Check available quantity
      const quantity = Number(availableQuantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Available quantity must be at least 1.",
        });
      }

      // 5. Validate image URL
      let imageUrl;

      try {
        imageUrl = new URL(image);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid equipment image URL.",
        });
      }

      if (!["http:", "https:"].includes(imageUrl.protocol)) {
        return res.status(400).json({
          success: false,
          message: "Invalid image URL.",
        });
      }

      // 6. Get logged-in owner from MongoDB
      const owner = await usersCollection.findOne({
        email: req.user.email,
      });

      if (!owner || owner.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Only registered equipment owners can add equipment.",
        });
      }

      // 7. Prepare equipment document
      const equipment = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        location: location.trim(),

        rentalPrice: {
          daily: rentalTypes.includes("daily")
            ? Number(rentalPrice.daily)
            : null,
          weekly: rentalTypes.includes("weekly")
            ? Number(rentalPrice.weekly)
            : null,
          monthly: rentalTypes.includes("monthly")
            ? Number(rentalPrice.monthly)
            : null,
        },

        rentalTypes,
        availableQuantity: quantity,
        condition: condition.trim(),
        brand: brand.trim(),
        model: model.trim(),
        image: image.trim(),

        rentalTerms: Array.isArray(rentalTerms)
          ? rentalTerms.map((term) => String(term).trim()).filter(Boolean)
          : String(rentalTerms || "")
              .split("\n")
              .map((term) => term.trim())
              .filter(Boolean),

        // Owner information comes from the authenticated account.
        ownerId: req.user.id,

        owner: {
          id: req.user.id,
          name: owner.name,
          email: owner.email,
          image: owner.image || null,
        },

        // Every new equipment starts as pending.
        status: "pending",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 8. Save equipment in MongoDB
      const result = await equipmentCollection.insertOne(equipment);

      return res.status(201).json({
        success: true,
        message: "Equipment submitted successfully for approval.",
        equipment: {
          ...equipment,
          _id: result.insertedId,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
