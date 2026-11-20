import express from "express";

import { verifyToken, verifyOwner } from "../middleware/auth.js";

const router = express.Router();

export default function ownerEquipmentRoutes({
  equipmentCollection,
  usersCollection,
}) {
  // GET: Logged-in owner's equipment
  router.get("/", verifyToken, verifyOwner, async (req, res, next) => {
    try {
      // Get only the equipment of the logged-in owner
      const equipment = await equipmentCollection
        .find({ ownerId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        message: "Owner equipment fetched successfully.",
        equipment,
      });
    } catch (error) {
      next(error);
    }
  });

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
        images = [],
        rentalTerms,
      } = req.body;

      // 1. Validate required information
      if (
        !name?.trim() ||
        !description?.trim() ||
        !category?.trim() ||
        !location?.trim() ||
        !condition?.trim() ||
        !brand?.trim() ||
        !model?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required equipment information.",
        });
      }

      // 2. Validate rental types
      const allowedTypes = ["daily", "weekly", "monthly"];

      if (
        !Array.isArray(rentalTypes) ||
        rentalTypes.length === 0 ||
        !rentalTypes.every((type) => allowedTypes.includes(type)) ||
        new Set(rentalTypes).size !== rentalTypes.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid rental type.",
        });
      }

      // 3. Validate rental prices
      if (!rentalPrice || typeof rentalPrice !== "object") {
        return res.status(400).json({
          success: false,
          message: "Please provide rental prices.",
        });
      }

      const validatedPrices = {};

      for (const type of allowedTypes) {
        if (rentalTypes.includes(type)) {
          const price = Number(rentalPrice[type]);

          if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({
              success: false,
              message: `Please provide a valid ${type} rental price.`,
            });
          }

          validatedPrices[type] = price;
        } else {
          validatedPrices[type] = null;
        }
      }

      // 4. Validate quantity
      const quantity = Number(availableQuantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Available quantity must be at least 1.",
        });
      }

      // 5. Validate image URLs
      const imageList = [
        ...(Array.isArray(images) ? images : []),
        ...(image ? [image] : []),
      ];

      const uniqueImages = [
        ...new Set(
          imageList
            .filter((url) => typeof url === "string")
            .map((url) => url.trim())
            .filter(Boolean),
        ),
      ];

      if (uniqueImages.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide at least one equipment image.",
        });
      }

      const isValidImageUrl = (url) => {
        try {
          const parsedUrl = new URL(url);
          return ["http:", "https:"].includes(parsedUrl.protocol);
        } catch {
          return false;
        }
      };

      if (!uniqueImages.every(isValidImageUrl)) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid equipment image URLs.",
        });
      }

      // 6. Get logged-in owner
      const owner = await usersCollection.findOne({
        email: req.user.email,
      });

      if (!owner || owner.role !== "owner") {
        return res.status(403).json({
          success: false,
          message: "Only registered equipment owners can add equipment.",
        });
      }

      // 7. Prepare rental terms
      const terms = Array.isArray(rentalTerms)
        ? rentalTerms
        : String(rentalTerms || "").split("\n");

      // 8. Prepare equipment document
      const equipment = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        location: location.trim(),

        rentalPrice: validatedPrices,
        rentalTypes,

        availableQuantity: quantity,
        condition: condition.trim(),
        brand: brand.trim(),
        model: model.trim(),

        // First image remains the primary image.
        image: uniqueImages[0],
        images: uniqueImages,

        rentalTerms: terms.map((term) => String(term).trim()).filter(Boolean),

        ownerId: req.user.id,

        owner: {
          id: req.user.id,
          name: owner.name,
          email: owner.email,
          image: owner.image || null,
        },

        status: "pending",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 9. Save equipment in MongoDB
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
