import mongoose from 'mongoose'
import { transactionDbConnection } from '../../config/dbConnections.js'

const transactionSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "'Order ID' is required"],
            unique: true,
            ref: 'Order',
        },
        shopName: {
            type: String,
            required: [true, "'Shop Name' is required"],
            trim: true,
        },
        customerName: {
            type: String,
            required: [true, "'Customer Name' is required"],
            trim: true,
        },
        totalProductAmount: {
            type: Number,
            required: [true, "'Total Product Amount' is required"],
            default: 0,
        },
        productDiscount: {
            type: Number,
            default: 0,
        },
        couponDiscount: {
            type: Number,
            default: 0,
        },
        discountedAmount: {
            type: Number,
            default: 0,
        },
        vatOrTax: {
            type: Number,
            default: 0,
        },
        shippingCharge: {
            type: Number,
            default: 0,
        },
        orderAmount: {
            type: Number,
            required: [true, "'Order Amount' is required"],
            default: 0,
        },
        deliveredBy: {
            type: String,
            trim: true,
        },
        deliverymanIncentive: {
            type: Number,
            default: 0,
        },
        paymentMethod: {
            type: String,
            trim: true,
            required: [true, "'Payment Method' is required"],
            enum: {
                values: ['Cash', 'Digital', 'Wallet', 'Offline', 'credit_card'],
                message:
                    "'Payment Method' must be either 'Cash', 'Digital', 'Wallet', 'Offline', or 'credit_card'",
            },
        },
        paymentStatus: {
            type: String,
            trim: true,
            required: [true, "'Payment Status' is required"],
            enum: {
                values: ['Completed', 'Pending', 'Failed'],
                message:
                    "'Payment Status' must be either 'Completed', 'Pending', or 'Failed'",
            },
        },
    },
    {
        timestamps: true,
    }
)

const Transaction = transactionDbConnection.model(
    'Transaction',
    transactionSchema
)
export default Transaction
