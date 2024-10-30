import express from "express";
import {
  createOrderBusiness,
  deleteOrderBusinessById,
  getAllOrderBusiness,
  getOrderBusinessById,
  updateOrderBusinessById,
} from "../../../controllers/admin/business/orderBusinessController.js";

import { validateSchema } from "../../../middleware/validationMiddleware.js";
import orderBusinessValidationSchema from "./../../../validations/admin/business/orderBusinessValidator.js";
import { protect, restrictTo } from "../../../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, restrictTo("admin"),validateSchema(orderBusinessValidationSchema), createOrderBusiness)

  .get(getAllOrderBusiness);

router
  .route("/:id")
  .get(getOrderBusinessById)
  .put(protect, restrictTo("admin"),updateOrderBusinessById)
  .delete(protect, restrictTo("admin"),deleteOrderBusinessById);

export default router;
