import express from "express";
import { ObjectId } from "mongodb";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

export default function adminRoutes({
  usersCollection,
  equipmentCollection,
  bookingsCollection,
  paymentsCollection,
}) {
  // All routes below require token and admin role
  router.use(verifyToken, verifyAdmin);

  // ==========================================
  // USERS MANAGEMENT
  // ==========================================

  // GET: Fetch all registered users
  router.get("/users", async (req, res, next) => {
    try {
      const users = await usersCollection
        .find(
          {},
          {
            projection: {
              name: 1,
              email: 1,
              role: 1,
              image: 1,
              phone: 1,
              address: 1,
              createdAt: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      next(error);
    }
  });

  // PATCH: Change user role (Customer, Owner, Admin)
  router.patch("/users/:id/role", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const allowedRoles = ["customer", "owner", "admin"];
      if (!allowedRoles.includes(role?.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Role must be customer, owner, or admin.",
        });
      }

      let filter;
      if (ObjectId.isValid(id)) {
        filter = { _id: new ObjectId(id) };
      } else {
        filter = { id: id };
      }

      const result = await usersCollection.updateOne(filter, {
        $set: {
          role: role.toLowerCase(),
          updatedAt: new Date(),
        },
      });

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `User role successfully updated to ${role}.`,
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE: Delete a user
  router.delete("/users/:id", async (req, res, next) => {
    try {
      const { id } = req.params;

      let filter;
      if (ObjectId.isValid(id)) {
        filter = { _id: new ObjectId(id) };
      } else {
        filter = { id: id };
      }

      const result = await usersCollection.deleteOne(filter);

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // EQUIPMENT MANAGEMENT
  // ==========================================

  // GET: Fetch all equipment (pending, approved, rejected)
  router.get("/equipment", async (req, res, next) => {
    try {
      const { status } = req.query;
      const query = {};

      if (status && ["pending", "approved", "rejected"].includes(status)) {
        query.status = status;
      }

      const equipment = await equipmentCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        equipment,
      });
    } catch (error) {
      next(error);
    }
  });

  // PATCH: Approve or Reject equipment status
  router.patch("/equipment/:id/status", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be pending, approved, or rejected.",
        });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid equipment ID.",
        });
      }

      const result = await equipmentCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Equipment not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Equipment status updated to ${status}.`,
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE: Delete equipment by Admin
  router.delete("/equipment/:id", async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid equipment ID.",
        });
      }

      const result = await equipmentCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Equipment not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Equipment deleted successfully by Admin.",
      });
    } catch (error) {
      next(error);
    }
  });

  // ==========================================
  // ALL RENTALS MANAGEMENT
  // ==========================================

  // GET: Fetch all rental bookings on the platform
  router.get("/rentals", async (req, res, next) => {
    try {
      const rentals = await bookingsCollection
        .find({})
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
  // DASHBOARD ANALYTICS (Challenge 3)
  // ==========================================

  // GET: Dynamic Admin Platform Analytics
  router.get("/analytics", async (req, res, next) => {
    try {
      const [
        totalUsers,
        totalOwners,
        totalCustomers,
        totalEquipment,
        approvedEquipment,
        pendingApprovals,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        completedRentals,
        paidPayments,
      ] = await Promise.all([
        usersCollection.countDocuments({}),
        usersCollection.countDocuments({ role: "owner" }),
        usersCollection.countDocuments({ role: "customer" }),
        equipmentCollection.countDocuments({}),
        equipmentCollection.countDocuments({ status: "approved" }),
        equipmentCollection.countDocuments({ status: "pending" }),
        bookingsCollection.countDocuments({}),
        bookingsCollection.countDocuments({
          bookingStatus: { $in: ["confirmed", "active", "completed"] },
        }),
        bookingsCollection.countDocuments({ bookingStatus: "pending" }),
        bookingsCollection.countDocuments({ bookingStatus: "completed" }),
        paymentsCollection.find({ status: "succeeded" }).toArray(),
      ]);

      const totalRevenue = paidPayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );

      // Monthly booking aggregation (last 6 months)
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const recentBookings = await bookingsCollection
        .find({ createdAt: { $gte: sixMonthsAgo } })
        .toArray();

      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];

      const monthlyStats = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mLabel = monthNames[d.getMonth()];
        const count = recentBookings.filter((b) => {
          const bDate = new Date(b.createdAt);
          return (
            bDate.getMonth() === d.getMonth() &&
            bDate.getFullYear() === d.getFullYear()
          );
        }).length;

        monthlyStats.push({
          label: mLabel,
          value: String(count),
          height: Math.min(100, Math.max(25, count * 15)),
        });
      }

      return res.status(200).json({
        success: true,
        analytics: {
          totalUsers,
          totalOwners,
          totalCustomers,
          totalEquipment,
          approvedEquipment,
          pendingApprovals,
          totalBookings,
          confirmedBookings,
          pendingBookings,
          completedRentals,
          totalRevenue,
          monthlyStats,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
