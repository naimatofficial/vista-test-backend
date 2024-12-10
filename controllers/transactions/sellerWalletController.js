import SellerWallet from '../../models/transactions/sellerWalletModel.js'
import Order from '../../models/transactions/orderModel.js'
import catchAsync from '../../utils/catchAsync.js'
import AppError from '../../utils/appError.js'
import Vendor from '../../models/sellers/vendorModel.js'
import { deleteKeysByPattern } from '../../services/redisService.js'
import {
    deleteOne,
    getAll,
    getOne,
    updateOne,
} from '../../factory/handleFactory.js'

export const createSellerWallet = async (order, seller, commission) => {
    try {
        const pendingWithdraw =
            order.totalAmount - commission - order.totalTaxAmount || 0

        const newWallet = {
            vendor: seller._id,
            totalCommissionGiven: commission,
            totalTaxGiven: order.totalTaxAmount,
            pendingWithdraw,
        }

        // Find the latest Seller Wallet and update commission atomically
        const updatedWallet = await SellerWallet.create(newWallet)
        // Handle case where no document exists
        if (!updatedWallet) {
            return `Seller Wallet is not created.`
        }

        // Clear cache related to AdminWallet
        await deleteKeysByPattern('SellerWallet')

        return true // Return success
    } catch (error) {
        console.error('Error updating Seller Wallet commission:', error.message)
        return `Failed to update Seller Wallet: ${error.message}`
    }
}

// Controller to calculate and update seller wallet
export const calculateSellerWallet = catchAsync(async (req, res, next) => {
    const { sellerId } = req.body // Change to req.query since it's a GET request

    // Check if the seller exists
    const vendor = await Vendor.findById(sellerId)
    if (!vendor) {
        return next(new AppError('Referenced vendor does not exist', 400))
    }

    // Initialize variables to store calculated values
    let withdrawableBalance = 0
    let pendingWithdraw = 0
    let alreadyWithdrawn = 0
    let totalCommissionGiven = 0
    let totalTaxGiven = 0
    let totalDeliveryChargeEarned = 0
    let collectedCash = 0

    // Calculate Withdrawable Balance
    const completedOrders = await Order.find({
        vendorId: sellerId,
        orderStatus: 'delivered',
    })
    completedOrders.forEach((order) => {
        withdrawableBalance += order.totalAmount
    })

    // Calculate Pending Withdraw
    const pendingWithdrawalOrders = await Order.find({
        vendorId: sellerId,
        paymentStatus: 'pending',
    })
    pendingWithdrawalOrders.forEach((order) => {
        pendingWithdraw += order.totalAmount
    })

    // Calculate Total Commission Given
    const vendorOrders = await Order.find({ vendorId: sellerId })
    vendorOrders.forEach((order) => {
        totalCommissionGiven += order.commission
    })

    // Calculate Total Tax Given
    vendorOrders.forEach((order) => {
        totalTaxGiven += order.taxAmount
    })

    // Calculate Total Delivery Charge Earned
    vendorOrders.forEach((order) => {
        totalDeliveryChargeEarned += order.deliveryCharge
    })

    // Calculate Collected Cash (if applicable)
    const collectedOrders = await Order.find({
        vendorId: sellerId,
        cashCollected: true,
    })
    collectedOrders.forEach((order) => {
        collectedCash += order.totalAmount
    })

    // Update or Create Seller Wallet
    let sellerWallet = await SellerWallet.findOne({ sellerId })
    if (!sellerWallet) {
        sellerWallet = await SellerWallet.create({
            sellerId,
            withdrawableBalance: withdrawableBalance.toFixed(2),
            pendingWithdraw: pendingWithdraw.toFixed(2),
            alreadyWithdrawn: alreadyWithdrawn.toFixed(2),
            totalCommissionGiven: totalCommissionGiven.toFixed(2),
            totalTaxGiven: totalTaxGiven.toFixed(2),
            totalDeliveryChargeEarned: totalDeliveryChargeEarned.toFixed(2),
            collectedCash: collectedCash.toFixed(2),
        })
    } else {
        sellerWallet.withdrawableBalance = withdrawableBalance.toFixed(2)
        sellerWallet.pendingWithdraw = pendingWithdraw.toFixed(2)
        sellerWallet.alreadyWithdrawn = alreadyWithdrawn.toFixed(2)
        sellerWallet.totalCommissionGiven = totalCommissionGiven.toFixed(2)
        sellerWallet.totalTaxGiven = totalTaxGiven.toFixed(2)
        sellerWallet.totalDeliveryChargeEarned =
            totalDeliveryChargeEarned.toFixed(2)
        sellerWallet.collectedCash = collectedCash.toFixed(2)
        await sellerWallet.save()
    }

    // Send the response with updated wallet data
    res.status(200).json({
        status: 'success',
        doc: sellerWallet,
    })
})

// Function to get a seller wallet by seller ID
export const getSellerWallets = getAll(SellerWallet)
export const getSellerWalletById = getOne(SellerWallet)

export const updateSellerWalletById = updateOne(SellerWallet)
export const deleteSellerWalletById = deleteOne(SellerWallet)
