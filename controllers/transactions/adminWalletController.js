import Order from '../../models/transactions/orderModel.js'
import catchAsync from '../../utils/catchAsync.js'
import Product from '../../models/admin/business/productBusinessModel.js'
import Customer from '../../models/users/customerModel.js'
import Vendor from '../../models/sellers/vendorModel.js'
import AdminWallet from '../../models/transactions/adminWalletModel.js'
import { deleteKeysByPattern } from '../../services/redisService.js'
import {
    deleteOne,
    getAll,
    getOne,
    updateOne,
} from '../../factory/handleFactory.js'

// Get Business Analytics
export const getBusinessAnalytics = catchAsync(async (req, res, next) => {
    //Get total orders count
    const totalOrders = await Order.countDocuments()

    // Get total products count
    const totalProducts = await Product.countDocuments()

    // Get total customers count
    const totalCustomers = await Customer.countDocuments()

    // Get total stores (vendors) count
    const totalStores = await Vendor.countDocuments()

    //Get Order Status count
    const pendingOrder = await Order.countDocuments({})

    // Get order statuses count
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' })
    const confirmedOrders = await Order.countDocuments({
        orderStatus: 'confirmed',
    })
    const packagingOrders = await Order.countDocuments({
        orderStatus: 'packaging',
    })
    const outForDeliveryOrders = await Order.countDocuments({
        orderStatus: 'out_for_delivery',
    })
    const deliveredOrders = await Order.countDocuments({
        orderStatus: 'delivered',
    })
    const failedToDeliverOrders = await Order.countDocuments({
        orderStatus: 'failed_to_deliver',
    })
    const returnedOrders = await Order.countDocuments({
        orderStatus: 'returned',
    })
    const canceledOrders = await Order.countDocuments({
        orderStatus: 'canceled',
    })

    // Send the response
    res.status(200).json({
        status: 'success',
        doc: {
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
        },
    })
})

export const createAdminWallet = async (order, seller, commission) => {
    try {
        const commissionAmount = Number(commission) || 0

        const newWallet = {
            vendor: seller._id,
            InhouseEarning: seller.role === 'in-house' ? order.totalAmount : 0,
            commissionEarned: commissionAmount,
            pendingAmount: order.totalAmount - commissionAmount,
            totalTaxCollected: order.totalTaxAmount,
            deliveryChargeEarned:
                seller.role === 'in-house' ? order.totalShippingCost : 0,
        }

        // Find the latest Admin Wallet and update commission atomically
        const updatedWallet = await AdminWallet.create(newWallet)
        // Handle case where no document exists
        if (!updatedWallet) {
            return `Admin Wallet is not created.`
        }

        // Clear cache related to AdminWallet
        await deleteKeysByPattern('AdminWallet')

        return true // Return success
    } catch (error) {
        console.error('Error updating Admin Wallet commission:', error.message)
        return `Failed to update Admin Wallet: ${error.message}`
    }
}

export const getAdminWallets = getAll(AdminWallet)
export const getAdminWalletById = getOne(AdminWallet)

export const updateAdminWalletById = updateOne(AdminWallet)
export const deleteAdminWalletById = deleteOne(AdminWallet)

export const calculateAdminWallet = catchAsync(async (req, res, next) => {
    const aggregatedData = await AdminWallet.aggregate([
        {
            $group: {
                _id: null,
                totalInhouseEarning: { $sum: { $toDouble: '$InhouseEarning' } },
                totalCommissionEarned: {
                    $sum: { $toDouble: '$commissionEarned' },
                },
                totalDeliveryChargeEarned: {
                    $sum: { $toDouble: '$deliveryChargeEarned' },
                },
                totalTaxCollected: {
                    $sum: { $toDouble: '$totalTaxCollected' },
                },
                totalPendingAmount: { $sum: { $toDouble: '$pendingAmount' } },
            },
        },
        { $project: { _id: 0 } }, // Exclude the _id field from the response
    ])

    const response = aggregatedData[0] || {
        totalInhouseEarning: 0,
        totalCommissionEarned: 0,
        totalDeliveryChargeEarned: 0,
        totalTaxCollected: 0,
        totalPendingAmount: 0,
    }

    res.status(200).json({
        status: 'success',
        totals: response,
    })
})

// export const getTopCustomersProductsAndVendors = catchAsync(
//     async (req, res, next) => {
//         // Top Products Aggregation: Get the most ordered products
//         const topProductsPromise = Order.aggregate([
//             { $unwind: '$products' }, // Unwind products array in Order schema
//             {
//                 $group: {
//                     _id: '$products.productId', // Group by product ID inside products object
//                     totalOrders: { $sum: '$products.quantity' }, // Sum up product quantities ordered
//                 },
//             },
//             {
//                 $sort: { totalOrders: -1 }, // Sort by total orders in descending order
//             },
//             {
//                 $limit: 5, // Limit to top 5 most ordered products
//             },
//             {
//                 $lookup: {
//                     from: 'products', // Join with the 'products' collection
//                     localField: '_id', // Match product ID from orders
//                     foreignField: '_id', // Match with _id in Product schema
//                     as: 'productDetails', // Store result in 'productDetails'
//                 },
//             },
//             {
//                 $unwind: '$productDetails', // Deconstruct productDetails array
//             },
//             {
//                 $project: {
//                     totalOrders: 1, // Show the total number of orders
//                     'productDetails.name': 1, // Show product name
//                     'productDetails.price': 1, // Show product price
//                     'productDetails.image': 1, // Show product image
//                     'productDetails.stock': 1, // Show available stock (if needed)
//                 },
//             },
//         ])

//         const [topProducts] = await Promise.all([topProductsPromise])

//         // Return the result
//         res.status(200).json({
//             status: 'success',
//             data: {
//                 topProducts,
//             },
//         })
//     }
// )
