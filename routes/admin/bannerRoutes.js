import express from 'express'
import {
    createBanner,
    getBanners,
    updateBanner,
    deleteBanner,
    getBannerById,
    updateBannerPublishStatus,
} from '../../controllers/admin/bannerController.js'
import checkObjectId from '../../middleware/checkObjectId.js'
import { protect, restrictTo } from './../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(protect, restrictTo('promotion-management'), createBanner)
    .get(getBanners)

router
    .route('/:id', checkObjectId)
    .get(getBannerById)
    .put(protect, restrictTo('promotion-management'), updateBanner)
    .delete(protect, restrictTo('promotion-management'), deleteBanner)

router.put(
    '/publish/:id',
    protect,
    restrictTo('promotion-management'),
    updateBannerPublishStatus
)

export default router
