import express from 'express'

import {
    createCategory,
    deleteCategory,
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    updateCategoryStatus,
} from './../../../controllers/admin/categories/categoryController.js'

import { validateSchema } from '../../../middleware/validationMiddleware.js'
import categoryValidationSchema from './../../../validations/admin/categories/categoryValidator.js'
import { protect, restrictTo } from './../../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(
        protect,
        validateSchema(categoryValidationSchema),
        restrictTo('product-management'),
        createCategory
    )

    .get(getCategories)

router
    .route('/:id')
    .get(getCategoryById)
    .put(protect, restrictTo('product-management'), updateCategory)
    .delete(protect, restrictTo('product-management'), deleteCategory)

router.route('/slug/:slug').get(getCategoryBySlug)

router
    .route('/:id/status')
    .put(protect, restrictTo('product-management'), updateCategoryStatus)

export default router
