import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  updateCouponStatus,
  deleteCoupon,
} from "../../controllers/sellers/couponController.js";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, restrictTo("admin", "vendor"), createCoupon)

  // .get(getAllCoupons);
  .get(protect, getAllCoupons);

router
  .route("/:id")
  .get(getCouponById)
  .put(protect, restrictTo("admin"), updateCoupon)
  .delete(protect, restrictTo("admin"), deleteCoupon);

router.put("/status/:id", protect, restrictTo("admin"), updateCouponStatus);

export default router;
