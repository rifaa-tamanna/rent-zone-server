import express from "express";
import multer from "multer";

import { verifyToken, verifyOwner } from "../middleware/auth.js";

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

router.post(
  "/",
  verifyToken,
  verifyOwner,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const apiKey = process.env.IMGBB_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: "Image upload service is not configured.",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one image.",
        });
      }

      const uploadResults = await Promise.all(
        req.files.map(async (file) => {
          const formData = new URLSearchParams();

          formData.append("key", apiKey);
          formData.append("image", file.buffer.toString("base64"));

          const response = await fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error("Failed to upload an image to ImgBB.");
          }

          return result.data.url;
        }),
      );

      return res.status(200).json({
        success: true,
        message: "Images uploaded successfully.",
        images: uploadResults,
      });
    } catch (error) {
      console.error("Image upload error:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Image upload failed.",
      });
    }
  },
);

export default router;
