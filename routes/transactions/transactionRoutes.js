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
    .get(protect, restrictTo('reports-and-analysis'), getTransactions)

router
    .route('/:id')
    .get(protect, restrictTo('reports-and-analysis'), getTransactionById)
    .put(protect, restrictTo('reports-and-analysis'), updateTransaction)
    .delete(protect, restrictTo('reports-and-analysis'), deleteTransaction)

export default router
