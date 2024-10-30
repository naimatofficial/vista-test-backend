import express from 'express'
import redundRoutes from './refundRoutes.js'
import orderRoutes from './orderRoutes.js'
import adminWalletRoutes from './adminWalletRoutes.js'
import sellerWalletRoutes from './sellerWalletRoutes.js'
import transactionRoutes from './transactionRoutes.js'
import paymentRoutes from './paymentRoutes.js'

const router = express.Router()

// Use the various route files
router.use('/orders', orderRoutes)
router.use('/refunds', redundRoutes)
router.use('/admin-wallet', adminWalletRoutes)
router.use('/transaction', transactionRoutes)
router.use('/seller-wallet', sellerWalletRoutes)
router.use('/payment', paymentRoutes)

export default router
