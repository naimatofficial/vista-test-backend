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

    calculateSellerWallet
)

router.get(
    '/:sellerId',
    protect,

    getSellerWalletById
)

export default router
