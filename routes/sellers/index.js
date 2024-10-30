import express from 'express'

import vendorRoutes from './vendorRoutes.js'
import vendorBankRoutes from './vendorBankRotues.js'
import couponRoutes from './couponRoutes.js'
import productRoutes from './productRoutes.js'

const router = express.Router()

// SELLER DB ROUTES
router.use('/vendors', vendorRoutes)
router.use('/vendorBank', vendorBankRoutes)
router.use('/coupon', couponRoutes)
router.use('/products', productRoutes)

export default router
