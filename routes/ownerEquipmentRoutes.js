import express from "express";
import { ObjectId } from "mongodb";

import { verifyToken, verifyOwner } from "../middleware/auth.js";

const router = express.Router();

const allowedRentalTypes = ["daily", "weekly", "monthly"];

const isValidImageUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

export default function ownerEquipmentRoutes({
  equipmentCollection,
  usersCollection,
}) {
  // GET: Get all equipment added by logged-in owner
  router.get("/", verifyToken, verifyOwner, async (req, res, next) => {
    try {
      const equipment = await equipmentCollection
        .find({ ownerId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        message: "Equipment fetched successfully.",
        equipment,
      });
    } catch (error) {
      next(error);
    }
  });

  // PUT: Update owner's equipment
  router.put("/:id", verifyToken, verifyOwner, async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid equipment ID.",
        });
      }

      const {
        name,
        description,
        category,
        location,
        rentalTypes,
        rentalPrice,
        availableQuantity,
        condition,
        brand,
        model,
        image,
        images,
        rentalTerms,
      } = req.body;

      // Validate required fields
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

      // Validate rental types
      if (
        !Array.isArray(rentalTypes) ||
        rentalTypes.length === 0 ||
        !rentalTypes.every((type) => allowedRentalTypes.includes(type)) ||
        new Set(rentalTypes).size !== rentalTypes.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Please select valid rental types.",
        });
      }

      // Validate rental prices
      const validPrices = rentalTypes.every((type) => {
        const price = Number(rentalPrice?.[type]);
        return Number.isFinite(price) && price > 0;
      });

      if (!validPrices) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid rental prices.",
        });
      }

      // Validate available quantity
      const quantity = Number(availableQuantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Available quantity must be at least 1.",
        });
      }

      // Prepare image list
      const equipmentImages = Array.isArray(images) ? images : [];

      const allImages = [
        ...new Set([image, ...equipmentImages].filter(Boolean)),
      ];

      if (
        allImages.length === 0 ||
        allImages.length > 5 ||
        !allImages.every(isValidImageUrl)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide 1 to 5 valid image URLs.",
        });
      }

      // Prepare rental prices
      const updatedRentalPrice = {
        daily: rentalTypes.includes("daily") ? Number(rentalPrice.daily) : null,
        weekly: rentalTypes.includes("weekly")
          ? Number(rentalPrice.weekly)
          : null,
        monthly: rentalTypes.includes("monthly")
          ? Number(rentalPrice.monthly)
          : null,
      };

      // Update equipment only if it belongs to logged-in owner
      const result = await equipmentCollection.updateOne(
        {
          _id: new ObjectId(id),
          ownerId: req.user.id,
        },
        {
          $set: {
            name: name.trim(),
            description: description.trim(),
            category: category.trim(),
            location: location.trim(),
            rentalTypes,
            rentalPrice: updatedRentalPrice,
            availableQuantity: quantity,
            condition: condition.trim(),
            brand: brand.trim(),
            model: model.trim(),
            image: allImages[0],
            images: allImages,
            rentalTerms: Array.isArray(rentalTerms) ? rentalTerms : [],
            status: "pending",
            updatedAt: new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Equipment not found or you are not authorized to update it.",
        });
      }

      const updatedEquipment = await equipmentCollection.findOne({
        _id: new ObjectId(id),
        ownerId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: "Equipment updated successfully.",
        equipment: updatedEquipment,
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE: Remove owner's equipment
  router.delete("/:id", verifyToken, verifyOwner, async (req, res, next) => {
    try {
      const { id } = req.params;

      // Validate equipment ID
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid equipment ID.",
        });
      }

      // Delete only the logged-in owner's equipment
      const result = await equipmentCollection.deleteOne({
        _id: new ObjectId(id),
        ownerId: req.user.id,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Equipment not found or you are not authorized to delete it.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Equipment deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  });

  // POST: Add new equipment
  router.post("/", verifyToken, verifyOwner, async (req, res, next) => {
    try {
      const {
        name,
        description,
        category,
        location,
        rentalTypes,
        rentalPrice,
        availableQuantity,
        condition,
        brand,
        model,
        image,
        images,
        rentalTerms,
      } = req.body;

      // Validate required fields
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

      // Validate rental types
      if (
        !Array.isArray(rentalTypes) ||
        rentalTypes.length === 0 ||
        !rentalTypes.every((type) => allowedRentalTypes.includes(type)) ||
        new Set(rentalTypes).size !== rentalTypes.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Please select valid rental types.",
        });
      }

      // Validate rental prices
      const validPrices = rentalTypes.every((type) => {
        const price = Number(rentalPrice?.[type]);
        return Number.isFinite(price) && price > 0;
      });

      if (!validPrices) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid rental prices.",
        });
      }

      // Validate available quantity
      const quantity = Number(availableQuantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Available quantity must be at least 1.",
        });
      }

      // Prepare image list
      const equipmentImages = Array.isArray(images) ? images : [];

      const allImages = [
        ...new Set([image, ...equipmentImages].filter(Boolean)),
      ];

      if (
        allImages.length === 0 ||
        allImages.length > 5 ||
        !allImages.every(isValidImageUrl)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide 1 to 5 valid image URLs.",
        });
      }

      // Find logged-in owner
      const owner = await usersCollection.findOne({
        email: req.user.email,
      });

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Owner information not found.",
        });
      }

      // Prepare rental prices
      const newRentalPrice = {
        daily: rentalTypes.includes("daily") ? Number(rentalPrice.daily) : null,
        weekly: rentalTypes.includes("weekly")
          ? Number(rentalPrice.weekly)
          : null,
        monthly: rentalTypes.includes("monthly")
          ? Number(rentalPrice.monthly)
          : null,
      };

      // Prepare equipment document
      const newEquipment = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        location: location.trim(),
        rentalTypes,
        rentalPrice: newRentalPrice,
        availableQuantity: quantity,
        condition: condition.trim(),
        brand: brand.trim(),
        model: model.trim(),
        image: allImages[0],
        images: allImages,
        rentalTerms: Array.isArray(rentalTerms) ? rentalTerms : [],
        ownerId: req.user.id,
        ownerName: owner.name || owner.name,
        ownerEmail: req.user.email,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert equipment into MongoDB
      const result = await equipmentCollection.insertOne(newEquipment);

      return res.status(201).json({
        success: true,
        message: "Equipment added successfully.",
        equipment: {
          _id: result.insertedId,
          ...newEquipment,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
