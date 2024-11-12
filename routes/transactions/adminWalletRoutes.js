import express from 'express'
import {
    getBusinessAnalytics,
    calculateAdminWallet,
    getTopCustomersProductsAndVendors,
} from '../../controllers/transactions/adminWalletController.js'
import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'
const router = express.Router()

// Route to get business analytics data
router.get('/analytics', getBusinessAnalytics)

// Route to calculate and retrieve admin wallet data
router.get(
    '/',
    protect,

    calculateAdminWallet
)

//Route Of Top Customer/Product/Selling Store
router.get('/top', protect, getTopCustomersProductsAndVendors)

export default router
