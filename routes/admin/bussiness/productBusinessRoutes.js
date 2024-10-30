import express from "express";
import {
  createProductBusiness,
  deleteProductBusinessById,
  getAllProductBusiness,
  updateProductBusinessById,
} from "../../../controllers/admin/business/productBusinessController.js";

import { validateSchema } from "../../../middleware/validationMiddleware.js";
import productBusinessValidationSchema from "./../../../validations/admin/business/productBusinessValidator.js";
import { getProductBusinessById } from "./../../../controllers/admin/business/productBusinessController.js";
import { protect, restrictTo } from "../../../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, restrictTo
    ("admin"),validateSchema(productBusinessValidationSchema), createProductBusiness)

  .get(getAllProductBusiness);

router
  .route("/:id")
  .get(getProductBusinessById)
  .put(protect, restrictTo("admin"),updateProductBusinessById)
  .delete(protect, restrictTo("admin"),deleteProductBusinessById);

export default router;
