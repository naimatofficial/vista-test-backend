import express from 'express'
import {
    calculateSellerWallet,
    getSellerWalletById,
} from '../../controllers/transactions/sellerWalletController.js'
import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Route to calculate the seller wallet (GET)
router.get(
    '/calculate',
    //   protect,
    //   restrictTo("vendor", "admin"),
    calculateSellerWallet
)

// Route to get a specific seller wallet by seller ID (GET)
router.get(
    '/:sellerId',
    protect,
    restrictTo('vendor', 'admin'),
    getSellerWalletById
)

export default router
