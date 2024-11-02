import express from 'express'
import {
    createCoupon,
    getAllCoupons,
    getCouponById,
    updateCoupon,
    updateCouponStatus,
    deleteCoupon,
} from '../../controllers/sellers/couponController.js'
import { protect, restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(protect, restrictTo('promotion-management'), createCoupon)
    .get(protect, restrictTo('promotion-management'), getAllCoupons)

router
    .route('/:id')
    .get(getCouponById)
    .put(protect, restrictTo('promotion-management'), updateCoupon)
    .delete(protect, restrictTo('promotion-management'), deleteCoupon)

router.put(
    '/status/:id',
    protect,
    restrictTo('promotion-management'),
    updateCouponStatus
)

export default router
