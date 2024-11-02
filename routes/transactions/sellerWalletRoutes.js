import express from 'express'
import {
    calculateSellerWallet,
    getSellerWalletById,
} from '../../controllers/transactions/sellerWalletController.js'
import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.get(
    '/calculate',
    protect,
    restrictTo('vendor-management'),
    calculateSellerWallet
)

router.get(
    '/:sellerId',
    protect,
    restrictTo('vendor-management'),
    getSellerWalletById
)

export default router
