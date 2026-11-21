import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

export default function publicEquipmentRoutes({ equipmentCollection }) {
  // GET: Fetch 6 approved equipment for Featured Equipment section
  router.get("/featured", async (req, res, next) => {
    try {
      const items = await equipmentCollection
        .find({ status: "approved" })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();

      return res.status(200).json({
        success: true,
        count: items.length,
        equipment: items,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET: All approved equipment with Search, Filter, Sort & Pagination
  router.get("/", async (req, res, next) => {
    try {
      const {
        search = "",
        location = "",
        category = "",
        rentalType = "",
        minPrice,
        maxPrice,
        condition = "",
        sort = "newest",
        page = 1,
        limit = 9,
      } = req.query;

      // Base query: Only approved equipment for public view
      const query = { status: "approved" };

      // Search by name, description, brand, or model
      if (search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { brand: { $regex: regex } },
          { model: { $regex: regex } },
        ];
      }

      // Location search/filter
      if (location.trim()) {
        query.location = { $regex: new RegExp(location.trim(), "i") };
      }

      // Category filter
      if (category.trim() && category.toLowerCase() !== "all") {
        query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
      }

      // Rental type filter (e.g. daily, weekly, monthly)
      if (rentalType.trim() && rentalType.toLowerCase() !== "all") {
        query.rentalTypes = rentalType.trim().toLowerCase();
      }

      // Condition filter
      if (condition.trim() && condition.toLowerCase() !== "all") {
        query.condition = { $regex: new RegExp(`^${condition.trim()}$`, "i") };
      }

      // Price range filtering (based on daily rental price or active rental price)
      const parsedMinPrice = Number(minPrice);
      const parsedMaxPrice = Number(maxPrice);

      if (Number.isFinite(parsedMinPrice) || Number.isFinite(parsedMaxPrice)) {
        const priceQuery = {};
        if (Number.isFinite(parsedMinPrice)) {
          priceQuery.$gte = parsedMinPrice;
        }
        if (Number.isFinite(parsedMaxPrice)) {
          priceQuery.$lte = parsedMaxPrice;
        }

        // Check across daily, weekly, or monthly price fields
        query.$or = [
          { "rentalPrice.daily": priceQuery },
          { "rentalPrice.weekly": priceQuery },
          { "rentalPrice.monthly": priceQuery },
        ];
      }

      // Sorting
      let sortOptions = { createdAt: -1 }; // default newest
      if (sort === "price_asc") {
        sortOptions = { "rentalPrice.daily": 1, createdAt: -1 };
      } else if (sort === "price_desc") {
        sortOptions = { "rentalPrice.daily": -1, createdAt: -1 };
      } else if (sort === "newest") {
        sortOptions = { createdAt: -1 };
      }

      // Pagination
      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.max(1, parseInt(limit, 10) || 9);
      const skip = (pageNumber - 1) * pageSize;

      const totalItems = await equipmentCollection.countDocuments(query);
      const items = await equipmentCollection
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .toArray();

      const totalPages = Math.ceil(totalItems / pageSize);

      return res.status(200).json({
        success: true,
        equipment: items,
        pagination: {
          total: totalItems,
          page: pageNumber,
          limit: pageSize,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // GET: Fetch single equipment details
  router.get("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid equipment ID.",
        });
      }

      const item = await equipmentCollection.findOne({ _id: new ObjectId(id) });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Equipment not found.",
        });
      }

      return res.status(200).json({
        success: true,
        equipment: item,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
