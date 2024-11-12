import { v4 as uuidv4 } from 'uuid'

import catchAsync from '../../utils/catchAsync.js'
import redisClient from '../../config/redisConfig.js'
import APIFeatures from '../../utils/apiFeatures.js'
import { getCacheKey } from '../../utils/helpers.js'

import Product from '../../models/sellers/productModel.js'
import Vendor from '../../models/sellers/vendorModel.js'
import Customer from '../../models/users/customerModel.js'
import Coupon from '../../models/sellers/couponModel.js'
import Order from '../../models/transactions/orderModel.js'
import AppError from '../../utils/appError.js'

import { deleteKeysByPattern } from '../../services/redisService.js'
import { deleteOne } from './../../factory/handleFactory.js'
import { sendOrderEmail } from '../../services/orderMailServices.js'

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
    // Generate a UUID
    const uuid = uuidv4()

    // Convert it into a number by taking the first 6 characters of its hash
    const orderId = parseInt(uuid.replace(/-/g, '').slice(0, 6), 16)

    // Ensure it's exactly 6 digits by padding or trimming
    return orderId.toString().padStart(6, '0').slice(0, 6)
}

// Create a new order
export const createOrder = catchAsync(async (req, res, next) => {
    const {
        couponId,
        customerId,
        vendors,
        products,
        totalAmount,
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
        vendors,
        products,
        totalAmount,
        paymentMethod,
        shippingAddress,
        billingAddress,
        paymentStatus,
        orderNote,
    }

    const doc = await Order.create(newOrder)

    if (!doc) {
        return next(new AppError(`Order could not be created`, 400))
    }

    await deleteKeysByPattern('Order')

    // Send order confirmation email
    try {
        const customer = await Customer.findById(customerId).select(
            'firstName email'
        )
        await sendOrderEmail(customer, newOrder.orderId)

        console.log('Email send to cutomer')
    } catch (error) {
        console.error('Error sending email:', error)
    }

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
// Get order by ID
export const getOrderById = catchAsync(async (req, res, next) => {
    const { id } = req.params

    // Fetch the order by ID
    const order = await Order.findById(id).lean()

    if (!order) {
        return next(new AppError('No order found with that ID', 404))
    }

    // Fetch related data from the respective models
    const products = await Product.find({ _id: { $in: order.products } }).lean()
    const vendors = await Vendor.find({ _id: { $in: order.vendors } }).lean()
    const customer = await Customer.findById(order.customer).lean()

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
    const orderVendors = order.vendors.map(
        (vendorId) => vendorsMap[vendorId] || null
    )

    // Add full details of customer, products, and vendors to the order
    const orderDetails = {
        ...order, // Spread the existing order fields
        customer, // Add the customer object
        products: orderProducts, // Add the full product objects
        vendors: orderVendors, // Add the full vendor objects
    }

    res.status(200).json({
        status: 'success',
        doc: orderDetails,
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
    const orderVendors = order.vendors.map(
        (vendorId) => vendorsMap[vendorId] || null
    )

    // Add full details of customer, products, and vendors to the order
    const customerOrders = {
        ...order, // Spread the existing order fields
        customer, // Add the customer object
        products: orderProducts, // Add the full product objects
        vendors: orderVendors, // Add the full vendor objects
    }

    res.status(200).json({
        status: 'success',
        doc: customerOrders,
    })
})

// Update an order's status
export const updateOrderStatus = catchAsync(async (req, res, next) => {
    if (!req.body.status) {
        return next(new AppError(`Please provide status value.`, 400))
    }

    // Perform the update operation
    const doc = await Order.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
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
    for (const item of doc?.products) {
        const { product, quantity } = item

        // Update sold count by the quantity sold and reduce the stock by the same quantity
        await Product.findByIdAndUpdate(
            product,
            {
                $inc: {
                    sold: quantity, // Increment the sold count by the quantity sold
                    stock: -quantity, // Decrement the stock by the quantity sold
                },
            },
            { new: true }
        )

        await deleteKeysByPattern('Product')
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
