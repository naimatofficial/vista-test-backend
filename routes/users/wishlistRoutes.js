import express from 'express'
import { protect, restrictTo } from './../../middleware/authMiddleware.js'
import {
    addProductToWishlist,
    removeProductFromWishlist,
    getWishlist,
    getAllWishlists,
    deleteWishlist,
} from '../../controllers/users/wishlistController.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import wishlistValidationSchema from '../../validations/wishlistValidator.js'

const router = express.Router()

router.get('/', protect, getAllWishlists)

router.post(
    '/add',
    protect,
    validateSchema(wishlistValidationSchema),
    addProductToWishlist
)

router.delete('/products/:productId', protect, removeProductFromWishlist)

router
    .route('/:customerId')
    .get(protect, getWishlist)
    .delete(protect, deleteWishlist)

export default router
