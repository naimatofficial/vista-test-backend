import express from 'express'
import {
    deleteImages,
    getImageUrl,
    getProductImageUrl,
} from '../controllers/uploadController.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/upload', getImageUrl)
router.get(
    '/upload/product',
    protect,
    restrictTo('admin', 'vendor'),
    getProductImageUrl
)

router.delete('/delete-images', deleteImages)

export default router
