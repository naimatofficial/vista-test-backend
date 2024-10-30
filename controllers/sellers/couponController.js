import Coupon from '../../models/sellers/couponModel.js'
import Customer from '../../models/users/customerModel.js'

import redisClient from '../../config/redisConfig.js'
import catchAsync from '../../utils/catchAsync.js'
import APIFeatures from '../../utils/apiFeatures.js'
import { getCacheKey } from '../../utils/helpers.js'

import {
    getAll,
    getOne,
    updateOne,
    updateStatus,
    deleteOne,
    createOne,
} from '../../factory/handleFactory.js'
import Vendor from '../../models/sellers/vendorModel.js'

// Create a new coupon
// export const createCoupon = createOne(Coupon);

// Create Coupon
export const createCoupon = catchAsync(async (req, res, next) => {
    const {
        title,
        code,
        type,
        userLimit,
        couponBearer,
        discountType,
        discountAmount,
        minPurchase,
        maxDiscount,
        startDate,
        expiredDate,
        vendors,
        customers,
    } = req.body

    const createdBy = req.user?.id

    // Create the coupon document
    const newCoupon = new Coupon({
        title,
        code,
        type,
        userLimit,
        couponBearer,
        discountType,
        discountAmount,
        minPurchase,
        maxDiscount,
        startDate,
        expiredDate,
        vendors,
        customers,
        createdBy,
    })

    // Save the coupon to the database
    await newCoupon.save()

    if (!newCoupon) {
        return next(new AppError('Coupon could not be created', 400))
    }

    // Delete the previous cache for coupons
    const cacheKey = getCacheKey('Coupon', '', req.query)
    await redisClient.del(cacheKey)

    // Return the created coupon
    res.status(201).json({
        status: 'success',
        doc: newCoupon,
    })
})

// Get all coupons
export const getAllCoupons = getAll(Coupon)
// Controller for getting all coupons with vendor and customer details

// Get a single coupon

export const getCouponById = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('Coupon', req.params.id)

    // Check cache first
    const cachedDoc = await redisClient.get(cacheKey)

    if (cachedDoc) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            doc: JSON.parse(cachedDoc),
        })
    }

    // If not in cache, fetch from database
    let doc = await Coupon.findById(req.params.id).lean()

    if (!doc) {
        return next(new AppError(`No flash deal found with that ID`, 404))
    }

    const customers = await Customer.find({
        _id: { $in: doc.customers },
    }).lean()

    // If no reviews are found, initialize with an empty array
    if (!customers || customers.length === 0) {
        customers = []
    }
    const vendors = await Vendor.find({
        _id: { $in: doc.vendors },
    }).lean()

    // If no reviews are found, initialize with an empty array
    if (!vendors || vendors.length === 0) {
        vendors = []
    }

    // Add reviews (empty array if none found)
    doc = {
        ...doc,
        customers,
        vendors,
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc,
    })
})

// Update a coupon by ID
export const updateCoupon = updateOne(Coupon)

// Update coupon status by ID
export const updateCouponStatus = updateStatus(Coupon)

// Delete a coupon by ID
export const deleteCoupon = deleteOne(Coupon)
