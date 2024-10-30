import express from "express";
import {
  createOrderWise,
  deleteOrderWiseById,
  getAllOrderWise,
  getOrderWiseById,
  updateOrderWiseById,
} from "../../../controllers/admin/business/orderWiseController.js";

import { validateSchema } from "../../../middleware/validationMiddleware.js";
import orderWiseValidationSchema from "./../../../validations/admin/business/orderWiseValidator.js";
import { protect, restrictTo } from "../../../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(
    protect,
    restrictTo("admin"),
    validateSchema(orderWiseValidationSchema),
    createOrderWise
  )

  .get(getAllOrderWise);

router
  .route("/:id")
  .get(getOrderWiseById)
  .put(protect, restrictTo("admin"), updateOrderWiseById)
  .delete(protect, restrictTo("admin"), deleteOrderWiseById);

export default router;
