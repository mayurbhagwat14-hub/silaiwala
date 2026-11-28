const express = require("express");
const router = express.Router();
const { createReview, getReviews, getMyReviews, getFeaturedReviews } = require("../controllers/review.controller.js");
const { protect } = require("../../../middlewares/auth.middleware.js");

router.get("/my-reviews", protect, getMyReviews);
router.get("/featured", getFeaturedReviews);
router.get("/:targetType/:targetId", getReviews);
router.post("/", protect, createReview);

module.exports = router;
