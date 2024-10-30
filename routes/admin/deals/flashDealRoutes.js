import express from 'express'
import {
    createFlashDeal,
    getFlashDeals,
    updateFlashDeal,
    addProductToFlashDeal,
    updateFlashDealStatus,
    deleteFlashDeal,
    getFlashDealById,
    removeProductFromFlashDeal,
    updatePublishFlashDeal,
} from '../../../controllers/admin/deals/flashDealController.js'

import { validateSchema } from '../../../middleware/validationMiddleware.js'
import flashDealValidationSchema from '../../../validations/flashDealValidator.js'

import { protect } from '../../../middleware/authMiddleware.js'
import { restrictTo } from '../../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(
        protect,
        restrictTo('promotion-management'),
        validateSchema(flashDealValidationSchema),
        createFlashDeal
    )
    .get(getFlashDeals)

router
    .route('/:id')
    .get(getFlashDealById)
    .put(protect, restrictTo('promotion-management'), updateFlashDeal)
    .delete(protect, restrictTo('promotion-management'), deleteFlashDeal)

router
    .route('/add-product/:id')
    .put(protect, restrictTo('promotion-management'), addProductToFlashDeal)

router
    .route('/remove-product/:id')
    .put(
        protect,
        restrictTo('promotion-management'),
        removeProductFromFlashDeal
    )

router
    .route('/status/:id')
    .put(protect, restrictTo('promotion-management'), updateFlashDealStatus)

router
    .route('/publish/:id')
    .put(protect, restrictTo('promotion-management'), updatePublishFlashDeal)

export default router
