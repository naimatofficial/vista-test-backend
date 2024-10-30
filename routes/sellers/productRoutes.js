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
    .post(protect, restrictTo('Product Management'), createProduct)
    .get(getAllProducts)

// Static routes
router.route('/:productId/sold').get(sellProduct)

router.put(
    '/:productId/update-product-image',
    protect,
    restrictTo('admin', 'vendor'),
    updateProductImages
)

router
    .route('/:id')
    .get(getProductById)
    .put(protect, restrictTo('Product Management'), updateProduct)
    .delete(protect, restrictTo('admin', 'vendor', 'sub_admin'), deleteProduct)

router.put(
    '/status/:id',
    protect,
    restrictTo('admin', 'sub_admin'),
    updateProductStatus
)

router.get('/slug/:slug', getProductBySlug)

router
    .route('/:id/feature')
    .put(
        protect,
        restrictTo('admin', 'vendor', 'sub_admin'),
        updateProductFeaturedStatus
    )

export default router
