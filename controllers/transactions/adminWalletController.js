import Wallet from "../../models/transactions/adminWalletModel.js";
import Order from "../../models/transactions/orderModel.js";
import mongoose from "mongoose";
import catchAsync from "../../utils/catchAsync.js";
import Product from "../../models/admin/business/productBusinessModel.js";
import Customer from "../../models/users/customerModel.js";
import Vendor from "../../models/sellers/vendorModel.js";
import AppError from "../../utils/appError.js";

// Get Business Analytics
export const getBusinessAnalytics = catchAsync(async (req, res, next) => {
  //Get total orders count
  const totalOrders = await Order.countDocuments();

  // Get total products count
  const totalProducts = await Product.countDocuments();

  // Get total customers count
  const totalCustomers = await Customer.countDocuments();

  // Get total stores (vendors) count
  const totalStores = await Vendor.countDocuments();

  //Get Order Status count
  const pendingOrder = await Order.countDocuments({});

  // Get order statuses count
  const pendingOrders = await Order.countDocuments({ orderStatus: "pending" });
  const confirmedOrders = await Order.countDocuments({
    orderStatus: "confirmed",
  });
  const packagingOrders = await Order.countDocuments({
    orderStatus: "packaging",
  });
  const outForDeliveryOrders = await Order.countDocuments({
    orderStatus: "out_for_delivery",
  });
  const deliveredOrders = await Order.countDocuments({
    orderStatus: "delivered",
  });
  const failedToDeliverOrders = await Order.countDocuments({
    orderStatus: "failed_to_deliver",
  });
  const returnedOrders = await Order.countDocuments({
    orderStatus: "returned",
  });
  const canceledOrders = await Order.countDocuments({
    orderStatus: "canceled",
  });

  // Send the response
  res.status(200).json({
    status: "success",
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
  });
});

//// Calculate ADMIN wallet
export const calculateAdminWallet = catchAsync(async (req, res, next) => {
  const { ownerId, userType } = req.body;

  if (userType === "vendor") {
    const vendor = await mongoose.model("Vendor").findById(ownerId);

    if (!vendor) {
      return next(new AppError("Referenced vendor does not exist", 400));
    }
  } else if (userType === "admin") {
    const user = await mongoose.model("User").findById(ownerId);

    if (!user) {
      return next(new AppError("Referenced user does not exist", 400));
    }
  }

  // Initialize variables to store calculated values
  let inhouseEarnings = 0;
  let commissionEarned = 0;
  let deliveryChargeEarned = 0;
  let totalTaxCollected = 0;
  let pendingAmount = 0;

  // Calculate In-house Earnings
  // Assuming in-house earnings come from orders where a certain product is sold by the platform (not by vendors)
  const inhouseOrders = await Order.find({ vendorId: null }); // Assuming vendorId is null for in-house sales
  inhouseOrders.forEach((order) => {
    inhouseEarnings += order.totalAmount; // Assuming 'totalAmount' is the field for order total
  });

  // Calculate Commission Earned
  // Assuming commission is earned from vendors based on their sales
  const vendorOrders = await Order.find({ vendorId: { $ne: null } }); // Orders with vendor sales
  vendorOrders.forEach((order) => {
    commissionEarned += order.commission; // Assuming 'commission' is a field in the Order schema
  });

  // Calculate Delivery Charge Earned
  const ordersWithDeliveryCharges = await Order.find({
    deliveryCharge: { $gt: 0 },
  }); // Orders with delivery charges
  ordersWithDeliveryCharges.forEach((order) => {
    deliveryChargeEarned += order.deliveryCharge; // Assuming 'deliveryCharge' is a field in Order schema
  });

  // Calculate Total Tax Collected
  const allOrders = await Order.find();
  allOrders.forEach((order) => {
    totalTaxCollected += order.taxAmount; // Assuming 'taxAmount' is a field in the Order schema
  });

  // Calculate Pending Amount
  // Assuming pendingAmount refers to orders that are pending payment
  const pendingOrders = await Order.find({ orderStatus: "pending" });
  pendingOrders.forEach((order) => {
    pendingAmount += order.totalAmount; // Assuming 'totalAmount' for pending orders
  });

  // Update or Create Admin Wallet
  let adminWallet = await Wallet.findOne(); // Assuming only one Admin Wallet exists
  if (!adminWallet) {
    adminWallet = await Wallet.create({
      InhouseEarning: inhouseEarnings.toFixed(2),
      commissionEarned: commissionEarned.toFixed(2),
      deliveryChargeEarned: deliveryChargeEarned.toFixed(2),
      totalTaxCollected: totalTaxCollected.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
    });
  } else {
    adminWallet.InhouseEarning = inhouseEarnings.toFixed(2);
    adminWallet.commissionEarned = commissionEarned.toFixed(2);
    adminWallet.deliveryChargeEarned = deliveryChargeEarned.toFixed(2);
    adminWallet.totalTaxCollected = totalTaxCollected.toFixed(2);
    adminWallet.pendingAmount = pendingAmount.toFixed(2);
    await adminWallet.save();
  }

  // Respond with the updated admin wallet
  res.status(200).json({
    status: "success",
    doc: adminWallet,
  });
});

// //calculate top customer, product, vendor
// export const getTopCustomersProductsAndVendors = catchAsync(
//   async (req, res, next) => {
//     // Top Customers Aggregation
//     const topCustomersPromise = Order.aggregate([
//       {
//         $group: {
//           _id: "$customer", // Assuming customer is stored as an ObjectId in Order schema
//           totalSpent: { $sum: "$totalAmount" }, // Sum totalAmount for each customer
//         },
//       },
//       {
//         $sort: { totalSpent: -1 }, // Sort by total spent in descending order
//       },
//       {
//         $limit: 5, // Limit to top 5 customers
//       },
//       {
//         $lookup: {
//           from: "customers", // Collection name must match actual name
//           localField: "_id", // Match the _id field from customer
//           foreignField: "_id", // Match customer collection _id field
//           as: "customerDetails",
//         },
//       },
//       {
//         $unwind: "$customerDetails", // Unwind the customerDetails array
//       },
//       {
//         $project: {
//           totalSpent: 1,
//           "customerDetails.firstName": 1,
//           "customerDetails.lastName": 1,
//           "customerDetails.email": 1,
//         },
//       },
//     ]);

//     // Top Products Aggregation
//     const topProductsPromise = Order.aggregate([
//       { $unwind: "$products" }, // Unwind products array in Order schema
//       {
//         $group: {
//           _id: "$products", // Group by product ID
//           totalSold: { $sum: 1 }, // Count total orders for each product
//         },
//       },
//       {
//         $sort: { totalSold: -1 }, // Sort by total sold in descending order
//       },
//       {
//         $limit: 5, // Limit to top 5 products
//       },
//       {
//         $lookup: {
//           from: "products", // Ensure collection name matches your DB
//           localField: "_id", // Match product ID
//           foreignField: "_id", // Product schema ID
//           as: "productDetails",
//         },
//       },
//       {
//         $unwind: "$productDetails", // Unwind the productDetails array
//       },
//       {
//         $project: {
//           totalSold: 1,
//           "productDetails.name": 1,
//           "productDetails.price": 1,
//           "productDetails.image": 1,
//         },
//       },
//     ]);

//     // Top Vendors Aggregation
//     const topVendorsPromise = Order.aggregate([
//       { $unwind: "$vendors" }, // Unwind vendors array in Order schema
//       {
//         $group: {
//           _id: "$vendors", // Group by vendor ID
//           totalOrders: { $sum: 1 }, // Count total orders for each vendor
//         },
//       },
//       {
//         $sort: { totalOrders: -1 }, // Sort by total orders in descending order
//       },
//       {
//         $limit: 5, // Limit to top 5 vendors
//       },
//       {
//         $lookup: {
//           from: "vendors", // Ensure this matches the vendors collection
//           localField: "_id", // Match vendor ID
//           foreignField: "_id", // Vendor schema ID
//           as: "vendorDetails",
//         },
//       },
//       {
//         $unwind: "$vendorDetails", // Unwind the vendorDetails array
//       },
//       {
//         $project: {
//           totalOrders: 1,
//           "vendorDetails.shopName": 1,
//           "vendorDetails.email": 1,
//           "vendorDetails.phoneNumber": 1,
//         },
//       },
//     ]);

//     // Execute all queries in parallel
//     const [topCustomers, topProducts, topVendors] = await Promise.all([
//       topCustomersPromise,
//       topProductsPromise,
//       topVendorsPromise,
//     ]);

//     // Return the result
//     res.status(200).json({
//       status: "success",
//       doc: {
//         topCustomers,
//         topProducts,
//         topVendors,
//       },
//     });
//   }
// );

//calculate top customer, product, vendor

export const getTopCustomersProductsAndVendors = catchAsync(
  async (req, res, next) => {
    // Top Products Aggregation: Get the most ordered products
    const topProductsPromise = Order.aggregate([
      { $unwind: "$products" }, // Unwind products array in Order schema
      {
        $group: {
          _id: "$products.productId", // Group by product ID inside products object
          totalOrders: { $sum: "$products.quantity" }, // Sum up product quantities ordered
        },
      },
      {
        $sort: { totalOrders: -1 }, // Sort by total orders in descending order
      },
      {
        $limit: 5, // Limit to top 5 most ordered products
      },
      {
        $lookup: {
          from: "products", // Join with the 'products' collection
          localField: "_id", // Match product ID from orders
          foreignField: "_id", // Match with _id in Product schema
          as: "productDetails", // Store result in 'productDetails'
        },
      },
      {
        $unwind: "$productDetails", // Deconstruct productDetails array
      },
      {
        $project: {
          totalOrders: 1, // Show the total number of orders
          "productDetails.name": 1, // Show product name
          "productDetails.price": 1, // Show product price
          "productDetails.image": 1, // Show product image
          "productDetails.stock": 1, // Show available stock (if needed)
        },
      },
    ]);

    const [topProducts] = await Promise.all([topProductsPromise]);

    // Return the result
    res.status(200).json({
      status: "success",
      data: {
        topProducts,
      },
    });
  }
);
