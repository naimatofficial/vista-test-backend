import express from 'express'

import customerRoutes from './customerRoutes.js'
import subscriberRoutes from './subscriberRoutes.js'
import searchRoutes from './searchRoutes.js'
import reviewRoutes from './reviewRoutes.js'
import whishlist from './wishlistRoutes.js'
import otpRoutes from './otpRoutes.js'

const router = express.Router()

router.use('/customers', customerRoutes)
router.use('/otp', otpRoutes)
router.use('/subscribers', subscriberRoutes)
router.use('/search', searchRoutes)

router.use('/reviews', reviewRoutes)
router.use('/wishlists', whishlist)

export default router
