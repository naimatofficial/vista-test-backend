import express from 'express';
import {
    createTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactions,
    updateTransaction,
} from '../../controllers/transactions/transactionController.js';
import { validateSchema } from '../../middleware/validationMiddleware.js';
import transactionValidationSchema from '../../validations/admin/transactions/transactionValidator.js'
const router = express.Router();

// Define the routes for transactions
router
    .route('/')
    // POST /transactions - Create a new transaction
    .post(
        validateSchema(transactionValidationSchema),
        createTransaction
    )
    // GET /transactions - Get all transactions
    .get(
        getTransactions
    );

router
    .route('/:id')
    // GET /transactions/:id - Get a transaction by ID
    .get(
        getTransactionById
    )
    // PUT /transactions/:id - Update a transaction by ID
    .put(
        updateTransaction
    )
    // DELETE /transactions/:id - Delete a transaction by ID
    .delete(
        deleteTransaction
    );

export default router;
