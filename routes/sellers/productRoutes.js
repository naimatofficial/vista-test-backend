import express from 'express'
import {
    createProduct,
    updateProductImages,
    getAllProducts,
    getProductById,
    deleteProduct,
    updateProductStatus,
    updateProductFeaturedStatus,
    sellProduct,
    updateProduct,
    getProductBySlug,
} from '../../controllers/sellers/productController.js'
import { protect, restrictTo } from '../../middleware/authMiddleware.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import productValidationSchema from '../../validations/admin/sellers/productValidator.js'

const router = express.Router()

router
    .route('/')
    .post(protect, restrictTo('product-management'), createProduct)
    .get(getAllProducts)

// Static routes
router.route('/:productId/sold').get(sellProduct)

router.put(
    '/:productId/update-product-image',
    protect,
    restrictTo('product-management'),
    updateProductImages
)

router
    .route('/:id')
    .get(getProductById)
    .put(protect, restrictTo('product-management'), updateProduct)
    .delete(protect, restrictTo('product-management'), deleteProduct)

router.put(
    '/status/:id',
    protect,
    restrictTo('product-management'),
    updateProductStatus
)

router.get('/slug/:slug', getProductBySlug)

router
    .route('/:id/feature')
    .put(protect, restrictTo('product-management'), updateProductFeaturedStatus)

export default router
