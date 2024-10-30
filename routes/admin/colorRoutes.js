import express from 'express'
import {
    createColor,
    getColors,
    getColorById,
    updateColor,
    deleteColor,
} from '../../controllers/admin/colorController.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import colorValidationSchema from './../../validations/colorValidator.js'
import { protect, restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(
        protect,
        restrictTo('product-management'),
        validateSchema(colorValidationSchema),
        createColor
    )
    .get(getColors)

router
    .route('/:id')
    .get(getColorById)
    .put(protect, restrictTo('product-management'), updateColor)
    .delete(protect, restrictTo('product-management'), deleteColor)

export default router
