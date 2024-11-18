import catchAsync from '../../utils/catchAsync.js'
import Customer from '../../models/users/customerModel.js'
import Vendor from '../../models/sellers/vendorModel.js'
import Product from '../../models/sellers/productModel.js'
import Order from '../../models/transactions/orderModel.js'
import { getCacheKey } from '../../utils/helpers.js'
import redisClient from '../../config/redisConfig.js'

export const getAdminBusinessAnalytics = catchAsync(async (req, res, next) => {
    const cacheKey = 'adminBusinessAnalytics'

    // Check cache first
    const cachedDoc = await redisClient.get(cacheKey)

    if (cachedDoc) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            doc: JSON.parse(cachedDoc),
        })
    }

    // Execute all count queries in parallel
    const [
        totalOrders,
        totalProducts,
        totalCustomers,
        totalStores,
        pendingOrders,
        confirmedOrders,
        packagingOrders,
        outForDeliveryOrders,
        deliveredOrders,
        failedToDeliverOrders,
        returnedOrders,
        canceledOrders,
    ] = await Promise.all([
        Order.countDocuments(),
        Product.countDocuments(),
        Customer.countDocuments(),
        Vendor.countDocuments(),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'confirmed' }),
        Order.countDocuments({ status: 'packaging' }),
        Order.countDocuments({ status: 'out_for_delivery' }),
        Order.countDocuments({ status: 'delivered' }),
        Order.countDocuments({ status: 'failed_to_deliver' }),
        Order.countDocuments({ status: 'returned' }),
        Order.countDocuments({ status: 'canceled' }),
    ])

    // Construct the response document
    const doc = {
        totalOrders,
        totalProducts,
        totalCustomers,
        totalStores,
        ordersByStatus: {
            pending: pendingOrders,
            confirmed: confirmedOrders,
            packaging: packagingOrders,
            out_for_delivery: outForDeliveryOrders,
            delivered: deliveredOrders,
            failed_to_deliver: failedToDeliverOrders,
            returned: returnedOrders,
            canceled: canceledOrders,
        },
    }

    // Cache the result for 1 minute (60 seconds)
    await redisClient.setEx(cacheKey, 60, JSON.stringify(doc))

    // Send the response
    res.status(200).json({
        status: 'success',
        cached: false,
        doc,
    })
})

export const getVendorBusinessAnalytics = catchAsync(async (req, res, next) => {
    const vendor = req.user._id // Vendor ID from authenticated user

    console.log(req.user)

    // Query vendor-specific data in parallel
    const [
        totalOrders,
        totalProducts,
        pendingOrders,
        confirmedOrders,
        packagingOrders,
        outForDeliveryOrders,
        deliveredOrders,
        failedToDeliverOrders,
        returnedOrders,
        canceledOrders,
    ] = await Promise.all([
        Order.countDocuments({ vendors: { vendor } }), // Count orders for this vendor
        Product.countDocuments({ userId: vendor }), // Count products for this vendor
        Order.countDocuments({ vendors: { vendor }, status: 'pending' }),
        Order.countDocuments({ vendors: { vendor }, status: 'confirmed' }),
        Order.countDocuments({ vendors: { vendor }, status: 'packaging' }),
        Order.countDocuments({
            vendors: { vendor },
            status: 'out_for_delivery',
        }),
        Order.countDocuments({ vendors: { vendor }, status: 'delivered' }),
        Order.countDocuments({
            vendors: { vendor },
            status: 'failed_to_deliver',
        }),
        Order.countDocuments({ vendors: { vendor }, status: 'returned' }),
        Order.countDocuments({ vendors: { vendor }, status: 'canceled' }),
    ])

    const doc = {
        totalOrders,
        totalProducts,
        ordersByStatus: {
            pending: pendingOrders,
            confirmed: confirmedOrders,
            packaging: packagingOrders,
            out_for_delivery: outForDeliveryOrders,
            delivered: deliveredOrders,
            failed_to_deliver: failedToDeliverOrders,
            returned: returnedOrders,
            canceled: canceledOrders,
        },
    }

    // Cache the response for 1 minute
    const cacheKey = getCacheKey(`vendor:${vendor}:business`)
    await redisClient.setEx(cacheKey, 60, JSON.stringify(doc))

    // Send the response
    res.status(200).json({
        status: 'success',
        cached: false,
        doc,
    })
})
