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
router.use('/payment', paymentRoutes)

router.use('/seller-wallets', sellerWalletRoutes)
router.use('/admin-wallets', adminWalletRoutes)

router.use('/transaction', transactionRoutes)
router.use('/refunds', redundRoutes)

export default router
