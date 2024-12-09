import mongoose from 'mongoose'
import { transactionDbConnection } from '../../config/dbConnections.js'

const adminWalletSchema = new mongoose.Schema(
    {
        InhouseEarning: {
            type: Number,
            default: 0,
        },
        commissionEarned: {
            type: Number,
            default: 0,
        },
        deliveryChargeEarned: {
            type: Number,
            default: 0,
        },
        totalTaxCollected: {
            type: Number,
            default: 0,
        },
        pendingAmount: {
            type: Number,
            default: 0,
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: [true, 'Please provide vendor.'],
        },
    },
    { timestamps: true }
)

const AdminWallet = transactionDbConnection.model(
    'AdminWallet',
    adminWalletSchema
)

export default AdminWallet
