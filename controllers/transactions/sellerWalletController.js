import SellerWallet from "../../models/transactions/sellerWalletModel.js";
import Order from "../../models/transactions/orderModel.js";
import mongoose from "mongoose";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import Vendor from "../../models/sellers/vendorModel.js";

// Controller to calculate and update seller wallet
export const calculateSellerWallet = catchAsync(async (req, res, next) => {
  const { sellerId } = req.body; // Change to req.query since it's a GET request

  // Check if the seller exists
  const vendor = await Vendor.findById(sellerId);
  if (!vendor) {
    return next(new AppError("Referenced vendor does not exist", 400));
  }

  // Initialize variables to store calculated values
  let withdrawableBalance = 0;
  let pendingWithdraw = 0;
  let alreadyWithdrawn = 0;
  let totalCommissionGiven = 0;
  let totalTaxGiven = 0;
  let totalDeliveryChargeEarned = 0;
  let collectedCash = 0;

  // Calculate Withdrawable Balance
  const completedOrders = await Order.find({
    vendorId: sellerId,
    orderStatus: "delivered",
  });
  completedOrders.forEach((order) => {
    withdrawableBalance += order.totalAmount;
  });

  // Calculate Pending Withdraw
  const pendingWithdrawalOrders = await Order.find({
    vendorId: sellerId,
    paymentStatus: "pending",
  });
  pendingWithdrawalOrders.forEach((order) => {
    pendingWithdraw += order.totalAmount;
  });

  // Calculate Total Commission Given
  const vendorOrders = await Order.find({ vendorId: sellerId });
  vendorOrders.forEach((order) => {
    totalCommissionGiven += order.commission;
  });

  // Calculate Total Tax Given
  vendorOrders.forEach((order) => {
    totalTaxGiven += order.taxAmount;
  });

  // Calculate Total Delivery Charge Earned
  vendorOrders.forEach((order) => {
    totalDeliveryChargeEarned += order.deliveryCharge;
  });

  // Calculate Collected Cash (if applicable)
  const collectedOrders = await Order.find({
    vendorId: sellerId,
    cashCollected: true,
  });
  collectedOrders.forEach((order) => {
    collectedCash += order.totalAmount;
  });

  // Update or Create Seller Wallet
  let sellerWallet = await SellerWallet.findOne({ sellerId });
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
    });
  } else {
    sellerWallet.withdrawableBalance = withdrawableBalance.toFixed(2);
    sellerWallet.pendingWithdraw = pendingWithdraw.toFixed(2);
    sellerWallet.alreadyWithdrawn = alreadyWithdrawn.toFixed(2);
    sellerWallet.totalCommissionGiven = totalCommissionGiven.toFixed(2);
    sellerWallet.totalTaxGiven = totalTaxGiven.toFixed(2);
    sellerWallet.totalDeliveryChargeEarned = totalDeliveryChargeEarned.toFixed(
      2
    );
    sellerWallet.collectedCash = collectedCash.toFixed(2);
    await sellerWallet.save();
  }

  // Send the response with updated wallet data
  res.status(200).json({
    status: "success",
    doc: sellerWallet,
  });
});

// Function to get a seller wallet by seller ID
export const getSellerWalletById = catchAsync(async (req, res, next) => {
  const { sellerId } = req.params; // Get the sellerId from the request parameters

  // Check if the seller wallet exists
  const sellerWallet = await SellerWallet.findOne({ sellerId });
  if (!sellerWallet) {
    return next(new AppError("Seller wallet not found", 404));
  }

  // Send the response with the seller wallet data
  res.status(200).json({
    status: "success",
    doc: sellerWallet,
  });
});
