import express from 'express'
import {
    getAllWithdraws,
    getWithdrawById,
    updateWithdrawStatus,
    deleteWithdraw,
    createWithdrawRequest,
} from '../../controllers/transactions/withdrawController.js'

import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .get(protect, getAllWithdraws)
    .post(protect, createWithdrawRequest)

router
    .route('/:id')
    .get(protect, getWithdrawById)
    .delete(protect, deleteWithdraw)

router.put('/status/:id', protect, updateWithdrawStatus)

export default router
