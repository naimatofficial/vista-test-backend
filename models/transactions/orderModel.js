import mongoose from 'mongoose'
import { transactionDbConnection } from '../../config/dbConnections.js'
import AppError from '../../utils/appError.js'
import Product from '../sellers/productModel.js'
import Vendor from '../sellers/vendorModel.js'
import { checkReferenceId } from '../../utils/helpers.js'
import Customer from '../users/customerModel.js'

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: Number,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: [true, 'Please provide customer.'],
        },
        vendors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Vendor',
                required: [true, 'Please provide vendor.'],
            },
        ],
        products: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: [true, 'Please provide product.'],
                },
                quantity: {
                    type: Number,
                    required: [true, 'Please provide product quantity.'],
                    min: [1, 'Quantity cannot be less than 1.'],
                },
            },
        ],
        status: {
            type: String,
            enum: [
                'pending',
                'confirmed',
                'packaging',
                'out_for_delivery',
                'delivered',
                'failed_to_deliver',
                'returned',
                'canceled',
            ],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['Paid', 'Unpaid'],
            default: 'Unpaid',
        },
        totalAmount: {
            type: Number,
            required: [true, 'Please provide total amount.'],
        },
        paymentMethod: {
            type: String,
            enum: [
                'cash_on_delivery',
                'jazzCash',
                'credit_card',
                'bank_transfer',
            ],
            required: true,
        },
        shippingAddress: {
            type: {
                address: String,
                city: String,
                state: String,
                zipCode: String,
                country: String,
            },
            required: [true, 'Please provide shipping address.'],
        },
        billingAddress: {
            type: {
                address: String,
                city: String,
                state: String,
                zipCode: String,
                country: String,
            },
            required: [true, 'Please provide billing address.'],
        },
        orderNote: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
)

orderSchema.pre('save', async function (next) {
    await checkReferenceId(Customer, this.customer, next)

    // Check if products exist and validate them
    if (this.products && this.products.length > 0) {
        const productIds = this.products.map((p) => p.product)

        const productCheck = await Product.countDocuments({
            _id: { $in: productIds },
        }).lean()

        if (productCheck !== this.products.length) {
            return next(new AppError('One or more products do not exist.', 400))
        }
    }

    // Check if vendor exist and validate them
    if (this.vendors && this.vendors.length > 0) {
        const vendorCheck = await Vendor.countDocuments({
            _id: { $in: this.vendors },
        })

        if (vendorCheck !== this.vendors.length) {
            return next(new AppError('Vendor do not exist.', 400))
        }
    }
})

const Order = transactionDbConnection.model('Order', orderSchema)

export default Order
