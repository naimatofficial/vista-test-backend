import {
    createOne,
    getAll,
    getOne,
    updateOne,
    deleteOne,
} from '../../factory/handleFactory.js';
import Transaction from '../../models/transactions/transactionModel.js';

// Create Transaction
export const createTransaction = createOne(Transaction);

// Get All Transactions
export const getTransactions = getAll(Transaction);

// Get Transaction by ID
export const getTransactionById = getOne(Transaction);

// Update Transaction
export const updateTransaction = updateOne(Transaction);

// Delete Transaction
export const deleteTransaction = deleteOne(Transaction);
