import express from "express";
import { ObjectId } from "mongodb";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

export default function bookingPaymentRoutes({
  bookingsCollection,
  paymentsCollection,
  equipmentCollection,
  usersCollection,
}) {
  // ==========================================
  // CREATE BOOKING & STRIPE CHECKOUT
  // ==========================================

  router.post("/create-booking", verifyToken, async (req, res, next) => {
    try {
      const {
        equipmentId,
        startDate,
        endDate,
        rentalType = "daily",
        requiredQuantity = 1,
        contactNumber,
        deliveryAddress,
        additionalNotes,
        paymentMethod = "stripe",
      } = req.body;

      if (!ObjectId.isValid(equipmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid equipment ID.",
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required.",
        });
      }

      const qty = Number(requiredQuantity) || 1;
      if (qty < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be at least 1.",
        });
      }

      // Check equipment availability
      const equipment = await equipmentCollection.findOne({
        _id: new ObjectId(equipmentId),
      });

      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: "Equipment not found.",
        });
      }

      if (equipment.availableQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Only ${equipment.availableQuantity} units available.`,
        });
      }

      // Calculate rental duration & total amount
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      let unitPrice = equipment.rentalPrice?.daily || 0;
      if (rentalType === "weekly" && equipment.rentalPrice?.weekly) {
        unitPrice = equipment.rentalPrice.weekly / 7;
      } else if (rentalType === "monthly" && equipment.rentalPrice?.monthly) {
        unitPrice = equipment.rentalPrice.monthly / 30;
      }

      const totalAmount = Math.round(unitPrice * totalDays * qty);

      // Customer info
      const customer = await usersCollection.findOne({ email: req.user.email });

      // Generate a unique transaction reference
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Create booking record
      const newBooking = {
        equipmentId: equipment._id.toString(),
        equipmentName: equipment.name,
        equipmentImage: equipment.image,
        equipmentCategory: equipment.category,
        customerId: req.user.id,
        customerName: customer?.name || req.user.email.split("@")[0],
        customerEmail: req.user.email,
        customerPhone: contactNumber || customer?.phone || "",
        deliveryAddress: deliveryAddress || customer?.address || "",
        additionalNotes: additionalNotes || "",
        ownerId: equipment.ownerId,
        ownerName: equipment.ownerName || "Equipment Owner",
        ownerEmail: equipment.ownerEmail,
        rentalType,
        rentalDuration: `${totalDays} Day${totalDays > 1 ? "s" : ""}`,
        totalDays,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        requiredQuantity: qty,
        totalAmount,
        paymentStatus: "paid", // When confirmed via Stripe flow
        bookingStatus: "confirmed",
        transactionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const bookingResult = await bookingsCollection.insertOne(newBooking);

      // Save transaction to payments collection
      const newPayment = {
        bookingId: bookingResult.insertedId.toString(),
        transactionId,
        customerId: req.user.id,
        customerEmail: req.user.email,
        ownerId: equipment.ownerId,
        equipmentId: equipment._id.toString(),
        amount: totalAmount,
        currency: "USD",
        paymentMethod,
        status: "succeeded",
        createdAt: new Date(),
      };

      // Atomically decrement equipment quantity only if enough stock remains
      const stockUpdateResult = await equipmentCollection.updateOne(
        { _id: new ObjectId(equipmentId), availableQuantity: { $gte: qty } },
        { $inc: { availableQuantity: -qty }, $set: { updatedAt: new Date() } },
      );

      if (stockUpdateResult.modifiedCount === 0) {
        return res.status(409).json({
          success: false,
          message: "Stock unavailable. Another customer reserved this item just now.",
        });
      }

      await paymentsCollection.insertOne(newPayment);

      return res.status(201).json({
        success: true,
        message: "Booking confirmed and payment recorded successfully!",
        booking: {
          _id: bookingResult.insertedId,
          ...newBooking,
        },
        payment: newPayment,
      });
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // OWNER EQUIPMENT RENTALS & ANALYTICS
  // ==========================================

  // GET: Fetch all rentals for equipment owned by this owner
  router.get("/owner/rentals", verifyToken, async (req, res, next) => {
    try {
      const rentals = await bookingsCollection
        .find({ ownerId: req.user.id })
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

  // GET: Owner Dashboard Analytics (Challenge 3)
  router.get("/owner/analytics", verifyToken, async (req, res, next) => {
    try {
      const [ownerEquipment, ownerBookings, ownerPayments] = await Promise.all([
        equipmentCollection.find({ ownerId: req.user.id }).toArray(),
        bookingsCollection.find({ ownerId: req.user.id }).toArray(),
        paymentsCollection.find({ ownerId: req.user.id, status: "succeeded" }).toArray(),
      ]);

      const totalListed = ownerEquipment.length;
      const completedRentals = ownerBookings.filter(
        (b) => b.bookingStatus === "completed" || b.bookingStatus === "confirmed",
      ).length;

      const totalEarnings = ownerPayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );

      // Current month earnings
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyEarnings = ownerPayments
        .filter((p) => {
          const d = new Date(p.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Last 6 months trend
      const monthNames = [
        "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
        "Dec", "Jan", "Feb", "Mar", "Apr", "May",
      ];

      const earningsTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mName = monthNames[d.getMonth()];
        const monthAmount = ownerPayments
          .filter((p) => {
            const pDate = new Date(p.createdAt);
            return (
              pDate.getMonth() === d.getMonth() &&
              pDate.getFullYear() === d.getFullYear()
            );
          })
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        earningsTrend.push({
          label: mName,
          value: `$${monthAmount}`,
          height: Math.min(100, Math.max(25, monthAmount > 0 ? (monthAmount / 100) * 10 : 30)),
        });
      }

      return res.status(200).json({
        success: true,
        analytics: {
          totalListed,
          completedRentals,
          totalEarnings,
          monthlyEarnings,
          earningsTrend,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
