import mongoose from 'mongoose'
import { transactionDbConnection } from '../../config/dbConnections.js'

const adminWalletSchema = new mongoose.Schema(
    {
        InhouseEarning: {
            type: String,
            default: 0,
        },
        commissionEarned: {
            type: String,
            default: 0,
        },
        deliveryChargeEarned: {
            type: String,
            default: 0,
        },
        totalTaxCollected: {
            type: String,
            default: 0,
        },
        pendingAmount: {
            type: String,
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
