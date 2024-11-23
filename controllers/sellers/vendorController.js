import slugify from 'slugify'

import Vendor from '../../models/sellers/vendorModel.js'
import Product from '../../models/sellers/productModel.js'
import Order from '../../models/transactions/orderModel.js'
import VendorBank from '../../models/sellers/vendorBankModel.js'
import ProductReview from '../../models/users/productReviewModel.js'
import AppError from '../../utils/appError.js'

import catchAsync from '../../utils/catchAsync.js'
import { getCacheKey } from '../../utils/helpers.js'
import redisClient from '../../config/redisConfig.js'
import APIFeatures from '../../utils/apiFeatures.js'

import { deleteKeysByPattern } from '../../services/redisService.js'
import { createSendToken } from '../authController.js'
import { sendVendorApprovedEmail } from './../../services/vendorMailService.js'

export const createVendor = catchAsync(async (req, res, next) => {
    const {
        firstName,
        lastName,
        phoneNumber,
        email,
        password,
        shopName,
        address,
        vendorImage,
        logo,
        banner,
    } = req.body

    const newVendor = new Vendor({
        firstName,
        lastName,
        phoneNumber,
        email,
        password,
        shopName,
        address,
        vendorImage,
        logo,
        banner,
    })

    const doc = await newVendor.save()

    if (!doc) {
        return next(new AppError(`Vendor could not be created`, 400))
    }

    await deleteKeysByPattern('Vendor')

    res.status(201).json({
        status: 'success',
        doc,
    })
})

export const registerVendor = catchAsync(async (req, res, next) => {
    const {
        firstName,
        lastName,
        phoneNumber,
        email,
        password,
        shopName,
        address,
        vendorImage,
        logo,
        banner,
    } = req.body

    const newVendor = new Vendor({
        firstName,
        lastName,
        phoneNumber,
        email,
        password,
        shopName,
        address,
        vendorImage,
        logo,
        banner,
    })

    const doc = await newVendor.save()

    if (!doc) {
        return next(new AppError(`Vendor could not be created`, 400))
    }

    // delete all document caches related to this model
    await deleteKeysByPattern('Vendor')

    res.status(201).json({
        status: 'success',
        doc,
    })
})

//update the slug on the basis of shop name
export const updateVendor = catchAsync(async (req, res, next) => {
    const { id } = req.params

    const vendor = await Vendor.findById(id)

    if (!vendor) {
        return next(new AppError(`No vendor found with that ID`, 404))
    }

    const updatedData = { ...req.body }

    if (updatedData.shopName) {
        updatedData.slug = slugify(updatedData.shopName, { lower: true })
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(id, updatedData, {
        new: true,
        runValidators: true,
    })

    if (!updatedVendor) {
        return next(new AppError(`No vendor found with that ID`, 404))
    }

    // delete all document caches related to this model
    await deleteKeysByPattern('Vendor')

    res.status(200).json({
        status: 'success',
        doc: updatedVendor,
    })
})

// Get all vendors
export const getAllVendors = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('Vendor', '', req.query)

    // Check cache first
    const cacheddoc = await redisClient.get(cacheKey)

    if (cacheddoc !== null) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            results: JSON.parse(cacheddoc).length,
            doc: JSON.parse(cacheddoc),
        })
    }

    // EXECUTE QUERY
    let query = Vendor.find().populate('products bank').lean()

    const features = new APIFeatures(query, req.query)
        .filter()
        .sort()
        .fieldsLimit()
        .paginate()

    const vendors = await features.query

    // Step 2: Create an array to hold the vendor data with reviews and orders
    const vendorsWithDetails = await Promise.all(
        vendors.map(async (vendor) => {
            // Step 3: Fetch reviews for the vendor's products from the external database
            const reviews = await ProductReview.find({
                product: { $in: vendor.products }, // Assuming vendor.products contains product IDs
            }).lean()

            // Step 4: Fetch orders for the vendor's products from the external database
            const orders = await Order.find({
                products: { $in: vendor.products }, // Assuming vendor.products contains product IDs
            }).lean()

            // Combine vendor, reviews, and orders into one object
            return {
                ...vendor,
                reviews,
                orders,
                totalProducts: vendor.products.length, // Total number of products
                totalOrders: orders.length, // Total number of orders
            }
        })
    )

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(vendorsWithDetails))

    res.status(200).json({
        status: 'success',
        cached: false,
        results: vendorsWithDetails.length,
        doc: vendorsWithDetails,
    })
})

// Get vendor by ID
export const getVendorById = catchAsync(async (req, res, next) => {
    const vendorId = req.params.id

    const cacheKey = getCacheKey('Vendor', vendorId)

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
    let vendor = await Vendor.findById(vendorId)
        .populate('products bank')
        .lean()

    if (!vendor) {
        return next(new AppError(`No vendor found with that id`, 404))
    }

    const reviews = await ProductReview.find({
        product: { $in: vendor.products },
    }).lean()

    // Step 1: Fetch total products for the brand
    const products = vendor.products

    const totalProducts = products?.length || 0
    let orders = []

    if (products && products.length) {
        // Extract product IDs from the products
        const productIds = products.map((product) => product._id)

        // Step 3: Fetch total orders that contain these products
        orders = await Order.find({
            products: { $in: productIds }, // Match orders that contain any of the product IDs
        }).lean()
    }

    const totalOrders = orders.length || 0

    const doc = {
        ...vendor,
        reviews,
        orders,
        totalProducts,
        totalOrders,
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc,
    })
})

export const getVendorBySlug = catchAsync(async (req, res, next) => {
    const slug = req.params.slug

    const cacheKey = getCacheKey('Vendor', slug)

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
    let vendor = await Vendor.findOne({ slug }).populate('products bank').lean()

    if (!vendor) {
        return next(new AppError(`No Vendor found with that slug`, 404))
    }

    const reviews = await ProductReview.find({
        product: { $in: vendor.products },
    }).lean()

    // Step 1: Fetch total products for the brand
    const products = vendor.products

    const totalProducts = products?.length || 0
    let orders = []

    if (products && products.length) {
        // Extract product IDs from the products
        const productIds = products.map((product) => product._id)

        // Step 3: Fetch total orders that contain these products
        orders = await Order.find({
            products: { $in: productIds }, // Match orders that contain any of the product IDs
        }).lean()
    }

    const totalOrders = orders.length || 0

    const doc = {
        ...vendor,
        reviews,
        orders,
        totalProducts,
        totalOrders,
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc,
    })
})

// Delete vendor by ID
export const deleteVendor = catchAsync(async (req, res, next) => {
    const doc = await Vendor.findByIdAndDelete(req.params.id).exec()

    // Handle case where the document was not found
    if (!doc) {
        return next(new AppError(`No vendor found with that ID`, 404))
    }

    // Delete all products associated with the deleted vendor
    await Product.deleteMany({ userId: req.params.id }).exec()
    await VendorBank.deleteOne({ vendor: req.params.id }).exec()

    // Optionally, delete all document caches related to this model
    await deleteKeysByPattern('Vendor')
    await deleteKeysByPattern('Product')
    await deleteKeysByPattern('Bank')

    res.status(204).json({
        status: 'success',
        doc: null,
    })
})

// Update vendor status
export const updateVendorStatus = catchAsync(async (req, res, next) => {
    if (!req.body.status) {
        return next(new AppError(`Please provide status value.`, 400))
    }

    // Perform the update operation
    const doc = await Vendor.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        {
            new: true,
            runValidators: true,
        }
    )

    // Handle case where the document was not found
    if (!doc) {
        return next(new AppError(`No vendor found with that ID`, 404))
    }

    console.log(doc)

    if (req.body.status === 'approved') {
        await sendVendorApprovedEmail(doc.email, doc)
    }

    // delete all document caches related to this model
    await deleteKeysByPattern('Vendor')

    res.status(200).json({
        status: 'success',
        doc,
    })
})

export const updateShopStatus = catchAsync(async (req, res, next) => {
    // Perform the update operation
    const doc = await Vendor.findByIdAndUpdate(
        req.params.id,
        { shopStatus: req.body.shopStatus },
        {
            new: true,
            runValidators: true,
        }
    )

    // Handle case where the document was not found
    if (!doc) {
        return next(new AppError(`No vendor found with that ID`, 404))
    }

    // delete all document caches related to this model
    await deleteKeysByPattern('Vendor')

    res.status(200).json({
        status: 'success',
        doc,
    })
})

export const updateVendorPassword = catchAsync(async (req, res, next) => {
    console.log(req.user)
    const user = await Vendor.findById(req.user._id).select('+password')

    console.log(user)
    // 2) Check the Posted current password is correct
    const correct = await user.correctPassword(
        req.body.passwordCurrent,
        user.password
    )

    if (!correct) {
        return next(new AppError('Your current password is wrong.', 401))
    }

    // 3) If so, update the password
    user.password = req.body.passwordNew
    user.passwordChangedAt = Date.now()

    await user.save()

    await deleteKeysByPattern('Vendor')

    // 4) send JWT
    createSendToken(user, 200, res)
})

export const forgotVendorPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on posted email
    const email = req.body.email
    const user = await Vendor.findOne({ email })
    if (!user) {
        return next(
            new AppError('There is no user with that email address.', 404)
        )
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    // 3) Send it to user's email
    try {
        const resetURL = `${process.env.DOMAIN_NAME}/users/resetPassword/${resetToken}`

        // Get the user's IP address
        const ipAddress = req.ip
        const timestamp =
            new Date().toISOString().replace('T', ' ').substring(0, 16) + ' GMT'

        const message = createPasswordResetMessage(
            user.email,
            ipAddress,
            timestamp,
            resetURL
        )

        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)!',
            html: message,
        })

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        })
    } catch (err) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        await user.save({ validateBeforeSave: false })

        return next(
            new AppError(
                'There was an error sending the email. Try again later!',
                500
            )
        )
    }
})

export const resetVendorPassword = catchAsync(async (req, res, next) => {
    // 1) Create a hashedToken
    const { passwordNew, passwordConfirm } = req.body

    if (passwordNew !== passwordConfirm) {
        return next(new AppError('Passwords not matched!', 400))
    }

    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex')

    // 2) Check the user exists and also check password reset expires is greater then current time
    const user = await Vendor.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400))
    }

    // 3) Set email message
    const ipAddress = req.ip // Get the user's IP address
    const timestamp =
        new Date().toISOString().replace('T', ' ').substring(0, 16) + ' GMT'

    const message = createPasswordResetConfirmationMessage(
        user.email,
        ipAddress,
        timestamp
    )

    // 3) Update the user properties & remove the unnecessary fields
    user.password = passwordNew
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    user.passwordChangedAt = Date.now()

    await user.save()

    await sendEmail({
        email: user.email,
        subject: 'Password Reset Confirmation',
        html: message,
    })

    createSendToken(user, 200, res)
})
