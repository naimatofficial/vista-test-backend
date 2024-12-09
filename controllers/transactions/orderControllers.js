import * as crypto from 'crypto'

import catchAsync from '../../utils/catchAsync.js'
import redisClient from '../../config/redisConfig.js'
import { getCacheKey } from '../../utils/helpers.js'
import APIFeatures from '../../utils/apiFeatures.js'

import Product from '../../models/sellers/productModel.js'
import Vendor from '../../models/sellers/vendorModel.js'
import Customer from '../../models/users/customerModel.js'
import Coupon from '../../models/sellers/couponModel.js'
import Order from '../../models/transactions/orderModel.js'
import AppError from '../../utils/appError.js'

import { deleteKeysByPattern } from '../../services/redisService.js'
import { deleteOne } from './../../factory/handleFactory.js'
import {
    sendOrderEmailToCustomer,
    sendOrderEmailToVendor,
} from '../../services/orderMailServices.js'
import { createTransaction } from './transactionController.js'
import SellerBusiness from './../../models/admin/business/sellerBusinessModel.js'
import { createAdminWallet } from './adminWalletController.js'
import { createSellerWallet } from './sellerWalletController.js'

const updateCouponUserLimit = catchAsync(async (_couponId, next) => {
    // Find the coupon by ID
    const coupon = await Coupon.findById(_couponId)

    if (!coupon) {
        return next(new AppError(`No coupon found by that ID.`, 404))
    }

    // Check if the used count has reached or exceeded the limit
    if (coupon.userLimit.used >= coupon.userLimit.limit) {
        return next(new AppError(`Coupon is expired.`, 400))
    }

    // Increment the used field by 1
    coupon.userLimit.used += 1
    await coupon.save({ validateBeforeSave: true })
})

function generateOrderId() {
    // Generate a 6-character alphanumeric string
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const randomBytes = crypto.randomBytes(3) // Generate 3 bytes (24 bits)

    let orderId = ''

    // Convert each byte to a character in the characters string
    for (let i = 0; i < 8; i++) {
        const byte = randomBytes[i % 3] // Cycle through the 3 bytes
        orderId += characters.charAt(byte % characters.length) // Map byte to character
    }

    return orderId
}

export const createOrder = catchAsync(async (req, res, next) => {
    const {
        couponId,
        customerId,
        vendor,
        products,
        totalAmount,
        totalDiscount,
        totalQty,
        totalShippingCost,
        paymentMethod,
        shippingAddress,
        billingAddress,
        paymentStatus,
        orderNote,
    } = req.body

    if (couponId) {
        updateCouponUserLimit(couponId, next)
    }

    const newOrder = {
        orderId: generateOrderId(),
        coupon: couponId ? couponId : undefined,
        customer: customerId,
        vendor,
        products,
        totalAmount,
        totalDiscount,
        totalQty,
        totalShippingCost,
        paymentMethod,
        shippingAddress,
        billingAddress,
        paymentStatus,
        orderNote,
    }

    // Loop through the products and check stock availability
    for (const item of products) {
        const { product, quantity } = item
        const productDoc = await Product.findById(product)

        // Check if product exists and if stock is available
        if (!productDoc) {
            return next(
                new AppError(`Product with ID ${product} not found`, 404)
            )
        }

        if (productDoc.stock <= 0) {
            return next(
                new AppError(
                    `Stock is not available for product ${productDoc.name}`,
                    400
                )
            )
        }

        // Check if the requested quantity exceeds available stock
        if (quantity > productDoc.stock) {
            return next(
                new AppError(
                    `Stock is not available as you needed for product ${productDoc.name}`,
                    400
                )
            )
        }
    }

    const doc = await Order.create(newOrder)

    if (!doc) {
        return next(new AppError(`Order could not be created`, 400))
    }

    // If the order status is 'delivered', increment the product sell count
    for (const item of doc?.products) {
        const { product, quantity } = item

        // Update sold count by the quantity sold and reduce the stock by the same quantity
        await Product.findByIdAndUpdate(
            product,
            {
                $inc: {
                    stock: -quantity, // Decrement the stock by the quantity sold
                },
            },
            { new: true }
        )

        await deleteKeysByPattern('Product')
    }

    // Send order confirmation email
    const customer = await Customer.findById(customerId).select(
        'firstName email'
    )
    const seller = await Vendor.findById(vendor).select(
        'email firstName lastName shopName'
    )

    const bussiness = await SellerBusiness.findOne()
        .sort({ createdAt: -1 })
        .select('defaultCommission')
        .lean()

    const commission = orderAmount - bussiness.defaultCommission ?? 0

    // Add Admin new wallet with specific sellerId
    await createAdminWallet(totalAmount, seller, commission)

    await createSellerWallet(totalAmount, seller, commission)

    await createTransaction(newOrder, seller, customer)

    // sendOrderEmail(customer.email, customer, doc._id)
    await sendOrderEmailToCustomer(customer, newOrder.orderId)
    await sendOrderEmailToVendor(seller, customer, newOrder.orderId)

    await deleteKeysByPattern('Order')
    await deleteKeysByPattern('Vendor')

    res.status(201).json({
        status: 'success',
        doc,
    })
})

// Get all orders
export const getAllOrders = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('Order', '', req.query)
    const cachedDoc = await redisClient.get(cacheKey)

    if (cachedDoc) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            results: JSON.parse(cachedDoc).length,
            doc: JSON.parse(cachedDoc),
        })
    }

    let query = Order.find().lean()

    const features = new APIFeatures(query, req.query)
        .filter()
        .sort()
        .fieldsLimit()
        .paginate()

    const orders = await features.query

    // Batch fetching all products, vendors, and customers
    const productIds = orders.flatMap((order) =>
        order.products.map((p) => p.product)
    )

    const vendorIds = orders.map((order) => order.vendor)
    const customerIds = orders.map((order) => order.customer)

    const [products, vendors, customers] = await Promise.all([
        Product.find({ _id: { $in: productIds } }).lean(),
        Vendor.find({ _id: { $in: vendorIds } }).lean(),
        Customer.find({ _id: { $in: customerIds } }).lean(),
    ])

    const totalOrders = orders.map((order) => ({
        ...order,
        products: order.products.map((p) => ({
            ...p,
            product: products.find((prod) => prod._id.equals(p.product)),
        })),
        vendor: vendors.find((v) => v._id.equals(order.vendor)),
        customer: customers.find((c) => c._id.equals(order.customer)),
    }))

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(totalOrders))

    res.status(200).json({
        status: 'success',
        cached: false,
        results: totalOrders.length,
        doc: totalOrders,
    })
})

// Delete an order
export const deleteOrder = deleteOne(Order)

export const getOrderById = catchAsync(async (req, res, next) => {
    const { id } = req.params

    const cacheKey = getCacheKey('Order', id)

    // Check cache first
    const cachedDoc = await redisClient.get(cacheKey)

    if (cachedDoc) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            doc: JSON.parse(cachedDoc),
        })
    }

    // Fetch the order from the main database
    const order = await Order.findById(id).lean()
    if (!order) {
        return next(new AppError('No order found with that ID', 404))
    }

    // Fetch related data from other databases
    const productIds = order.products.map((p) => p.product)
    const vendorId = order.vendor
    const customerId = order.customer

    // Fetch data from respective databases (using respective models)
    const products = await Product.find({ _id: { $in: productIds } }).lean()
    const customer = await Customer.findById(customerId)
        .select('firstName lastName email phoneNumber')
        .lean()

    const vendor = await Vendor.findById(vendorId).lean()

    // Attach related data to the order object
    const detailedOrder = {
        ...order,
        products,
        vendor,
        customer,
    }

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(detailedOrder))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc: detailedOrder,
    })
})
export const getOrderStatus = catchAsync(async (req, res, next) => {
    const { orderId } = req.params

    const cacheKey = getCacheKey('Order', orderId)

    // Check cache first
    const cachedDoc = await redisClient.get(cacheKey)

    if (cachedDoc) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            doc: JSON.parse(cachedDoc),
        })
    }

    // Fetch the order from the main database
    const order = await Order.findOne({ orderId }).select('status').lean()

    if (!order) {
        return next(new AppError('No track order found with that ID', 404))
    }

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(order))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc: order,
    })
})

export const getCustomerOrderById = catchAsync(async (req, res, next) => {
    const { id } = req.params

    // Fetch the order by ID
    const order = await Order.findOne({ customer: id }).lean()

    if (!order) {
        return next(new AppError('No order found with that customer ID', 404))
    }

    // Fetch related data from the respective models
    const products = await Product.find({ _id: { $in: order.products } }).lean()
    const vendors = await Vendor.find({ _id: { $in: order.vendors } }).lean()
    const customer = await Customer.findById(id).lean()

    // Map products and vendors by their IDs for efficient lookup
    const productsMap = products.reduce((map, product) => {
        map[product._id] = product
        return map
    }, {})

    const vendorsMap = vendors.reduce((map, vendor) => {
        map[vendor._id] = vendor
        return map
    }, {})

    // Map the products array to their corresponding product documents
    const orderProducts = order.products.map(
        (productId) => productsMap[productId] || null
    )

    // Map the vendors array to their corresponding vendor documents
    const vendor = await Vendor.findById(vendorId).lean()

    // Add full details of customer, products, and vendors to the order
    const customerOrders = {
        ...order, // Spread the existing order fields
        customer, // Add the customer object
        vendor, // Add the full vendor objects
        products: orderProducts, // Add the full product objects
    }

    res.status(200).json({
        status: 'success',
        doc: customerOrders,
    })
})

// Update an order's status
export const updateOrderStatus = catchAsync(async (req, res, next) => {
    const status = req.body.status
    if (!status) {
        return next(new AppError(`Please provide status value.`, 400))
    }

    // Perform the update operation
    const doc = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        {
            new: true,
            runValidators: true,
        }
    )

    // Handle case where the document was not found
    if (!doc) {
        return next(new AppError(`No Order found with that ID`, 404))
    }

    // If the order status is 'delivered', increment the product sell count
    if (status === 'delivered') {
        for (const item of doc?.products) {
            const { product, quantity } = item

            // Update sold count by the quantity sold and reduce the stock by the same quantity
            await Product.findByIdAndUpdate(
                product,
                {
                    $inc: {
                        sold: quantity, // Increment the sold count by the quantity sold
                        // stock: -quantity, // Decrement the stock by the quantity sold
                    },
                },
                { new: true }
            )

            // Increment order count when creating an order
            await Vendor.findByIdAndUpdate(doc.vendor, {
                $inc: { totalOrders: 1 },
            })

            await await deleteKeysByPattern('Product')
            await await deleteKeysByPattern('Vendor')
        }
    }

    await deleteKeysByPattern('Order')

    res.status(200).json({
        status: 'success',
        doc,
    })
})

export const getOrderByCustomer = catchAsync(async (req, res, next) => {
    const customerId = req.params.customerId

    // Check cache first
    const cacheKey = getCacheKey('Order', customerId)
    const cachedDoc = await redisClient.get(cacheKey)

    if (cachedDoc) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            doc: JSON.parse(cachedDoc),
        })
    }

    // If not in cache, fetch from database
    const doc = await Order.findOne({ customer: customerId })

    if (!doc) {
        return next(new AppError(`No Order found with that customer Id`, 404))
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc,
    })
})
