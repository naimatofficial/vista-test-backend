import express from 'express'

import {
    createBusinessGeneral,
    deleteBusinessGeneralById,
    getAllBusinessGeneral,
    getBusinessGeneralById,
    updateBusinessGeneralById,
} from './../../../controllers/admin/business/businessGeneralController.js'

import { validateSchema } from '../../../middleware/validationMiddleware.js'
import businessGeneralValidationSchema from './../../../validations/admin/business/businessGeneralValidator.js'
import { protect, restrictTo } from '../../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(
        protect,
        restrictTo('system-settings'),
        validateSchema(businessGeneralValidationSchema),
        createBusinessGeneral
    )
    .get(getAllBusinessGeneral)

router
    .route('/:id')
    .get(getBusinessGeneralById)
    .put(protect, restrictTo('system-settings'), updateBusinessGeneralById)
    .delete(protect, restrictTo('system-settings'), deleteBusinessGeneralById)

export default router
