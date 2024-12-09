import express from 'express'
import {
    deleteSellerWalletById,
    getSellerWalletById,
    getSellerWallets,
    updateSellerWalletById,
} from '../../controllers/transactions/sellerWalletController.js'
import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

// router.get('/calculate', protect, calculateSellerWallet)

router.route('/').get(protect, getSellerWallets)

router
    .route('/:id')
    .get(protect, getSellerWalletById)
    .put(protect, updateSellerWalletById)
    .delete(protect, deleteSellerWalletById)

export default router
