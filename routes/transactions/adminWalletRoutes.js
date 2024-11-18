import express from 'express'
import {
    calculateAdminWallet,
    getTopCustomersProductsAndVendors,
} from '../../controllers/transactions/adminWalletController.js'
import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'
const router = express.Router()

// Route to calculate and retrieve admin wallet data
router.get(
    '/',
    protect,

    calculateAdminWallet
)

//Route Of Top Customer/Product/Selling Store
router.get('/top', protect, getTopCustomersProductsAndVendors)

export default router
