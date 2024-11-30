import express from 'express'
import {
    createTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactions,
    updateTransaction,
} from '../../controllers/transactions/transactionController.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import transactionValidationSchema from '../../validations/admin/transactions/transactionValidator.js'
import { protect, restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(validateSchema(transactionValidationSchema), createTransaction)
    .get(protect, getTransactions)

router
    .route('/:id')
    .get(protect, getTransactionById)
    .put(protect, updateTransaction)
    .delete(protect, deleteTransaction)

export default router
