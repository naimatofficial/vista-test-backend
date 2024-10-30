import mongoose from 'mongoose';
import { transactionDbConnection } from '../../config/dbConnections.js';

const transactionSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: [true, "'Order ID' is required"],
        unique: true, 
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
        required: [true, "'Discounted Amount' is required"],
        default: 0,
    },
    vatOrTax: {
        type: Number,
        required: [true, "'VAT/TAX' is required"],
        default: 0,
    },
    shippingCharge: {
        type: Number,
        required: [true, "'Shipping Charge' is required"],
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
        required: [true, "'Delivered By' is required"],
    },
    deliverymanIncentive: {
        type: Number,
        default: 0,
    },
    adminDiscount: {
        type: Number,
        default: 0,
    },
    sellerDiscount: {
        type: Number,
        default: 0, 
    },
    adminCommission: {
        type: Number,
        required: [true, "'Admin Commission' is required"],
        default: 0,
    },
    adminNetIncome: {
        type: Number,
        required: [true, "'Admin Net Income' is required"],
        default: 0,
    },
    sellerNetIncome: {
        type: Number,
        required: [true, "'Seller Net Income' is required"],
        default: 0,
    },
    paymentMethod: {
        type: String,
        trim: true,
        required: [true, "'Payment Method' is required"],
        enum: {
            values: ['Cash', 'Digital', 'Wallet', 'Offline', 'credit_card'], 
            message: "'Payment Method' must be either 'Cash', 'Digital', 'Wallet', 'Offline', or 'credit_card'",
        },
    },    
    paymentStatus: {
        type: String,
        trim: true,
        required: [true, "'Payment Status' is required"],
        enum: {
            values: ['Completed', 'Pending', 'Failed'],
            message: "'Payment Status' must be either 'Completed', 'Pending', or 'Failed'",
        },
    },
    action: {
        type: String,
        trim: true,
        default: '',
    },
}, {
    timestamps: true,
});

const Transaction = transactionDbConnection.model('Transaction', transactionSchema);
export default Transaction;
