import slugify from 'slugify'
import * as crypto from 'crypto'

import Vendor from '../../models/sellers/vendorModel.js'
import Product from '../../models/sellers/productModel.js'
import Order from '../../models/transactions/orderModel.js'
import VendorBank from '../../models/sellers/vendorBankModel.js'
import ProductReview from '../../models/users/productReviewModel.js'
import AppError from '../../utils/appError.js'

import catchAsync from '../../utils/catchAsync.js'
import {
    createPasswordResetMessage,
    createPasswordResetConfirmationMessage,
    getCacheKey,
} from '../../utils/helpers.js'
import redisClient from '../../config/redisConfig.js'
import APIFeatures from '../../utils/apiFeatures.js'

import {
    deleteKeysByPattern,
    removeRefreshToken,
} from '../../services/redisService.js'
import { createSendToken } from '../authController.js'
import { sendVendorApprovedEmail } from './../../services/vendorMailService.js'
import sendEmail from '../../services/emailService.js'

import * as otpService from './../../services/otpService.js'
import OTP from '../../models/users/otpModel.js'

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

    // 2. Generate OTP and save it in the OTP model
    const { token, hash } = otpService.generateOTP()
    await otpService.saveOTP(email, null, hash)

    // 3. Send OTP to email for verification
    await otpService.otpEmailSend(email, token)

    // 5. Respond with success message
    res.status(201).json({
        status: 'success',
        message: 'Please verify your account using the OTP sent to your email.',
    })
})

export const verifyVendorOTPViaEmail = catchAsync(async (req, res, next) => {
    const { token, email } = req.body

    // Fetch the latest OTP for this email
    const otpEntry = await OTP.findOne({ email }).sort({ createdAt: -1 }).exec()

    if (!otpEntry) {
        return next(new AppError('No OTP found for this email', 404))
    }

    // Check if the OTP has expired
    // 5-minute expiration
    const isExpired = Date.now() - otpEntry.createdAt > 5 * 60 * 1000

    if (isExpired) {

        await OTP.deleteMany({ email })
        return next(new AppError('OTP has expired', 400))

    }

    // Validate OTP hash
    const isValid = await otpService.validateOTP(token, otpEntry.hash)

    if (!isValid) return next(new AppError('Invalid OTP provided', 400))

    // OTP is valid; proceed with deletion and user verification
    await OTP.deleteMany({ email })

    await Vendor.findOneAndUpdate(
        { email },
        { verified: true },
        { new: true }
    ).exec()

    res.status(200).json({
        status: 'success',
        message: 'OTP verified successfully.',
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

export const getAllVendors = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('Vendor', '', req.query)

    // Step 1: Check cache for existing results
    const cachedResults = await redisClient.get(cacheKey)
    if (cachedResults) {
        return res.status(200).json({
            ...JSON.parse(cachedResults),
            status: 'success',
            cached: true,
        })
    }

    // Step 2: Extract query options and initialize ApiFeatures
    const { sort, limit = 100, page = 1, ...filters } = req.query

    const apiFeatures = new APIFeatures(Vendor.find(filters), req.query)
        .filter()
        .sort()
        .paginate()

    // Step 3: Fetch vendors based on filters and pagination
    const vendors = await apiFeatures.query.lean()

    // Step 4: Initialize an array to store results
    const results = []

    // Step 5: Fetch product counts for each vendor using aggregation pipeline
    for (let vendor of vendors) {
        const vendorId = vendor._id

        // Aggregation pipeline for products
        const [productCounts] = await Product.aggregate([
            { $match: { userId: vendorId } }, // Match products for the vendor
            {
                $facet: {
                    approvedCount: [
                        { $match: { status: 'approved' } },
                        { $count: 'approvedCount' },
                    ],
                    totalCount: [{ $count: 'totalCount' }],
                    orderCount: [
                        { $unwind: '$orders' },
                        { $match: { 'orders.userId': vendorId } },
                        { $count: 'orderCount' },
                    ],
                },
            },
        ])

        const approvedProducts =
            productCounts?.approvedCount?.[0]?.approvedCount || 0
        const totalProducts = productCounts?.totalCount?.[0]?.totalCount || 0
        const totalOrders = productCounts?.orderCount?.[0]?.orderCount || 0

        // Add the data to the vendor object
        vendor.approvedProducts = approvedProducts
        vendor.totalProducts = totalProducts
        vendor.totalOrders = totalOrders

        // Add reviews for the vendor (optional, can be optimized)
        vendor.reviews = await ProductReview.find({
            product: { $in: vendor.products },
        }).lean()

        // Push the updated vendor to results
        results.push(vendor)
    }

    // Step 6: Calculate pagination details
    const totalDocs = await Vendor.countDocuments()
    const totalPages = Math.ceil(totalDocs / limit)

    // Step 7: Build the response
    const response = {
        status: 'success',
        cached: false,
        totalDocs,
        results: results.length,
        currentPage: Number(page),
        totalPages,
        doc: results,
    }

    // Step 8: Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response))

    // Step 9: Send the response
    res.status(200).json(response)
})

// Get vendor by ID
export const getVendorById = catchAsync(async (req, res, next) => {
    const vendorId = req.params.id // Assuming vendorId is passed in the URL params

    const cacheKey = getCacheKey('Vendor', vendorId, req.query)

    // Step 1: Check cache for existing results
    const cachedResults = await redisClient.get(cacheKey)
    if (cachedResults) {
        return res.status(200).json({
            ...JSON.parse(cachedResults),
            status: 'success',
            cached: true,
        })
    }

    // Step 2: Extract query options (if any)
    // Step 3: Fetch the vendor based on the provided ID
    const vendor = await Vendor.findById(vendorId).lean()

    // Check if vendor exists
    if (!vendor) {
        return res.status(404).json({
            status: 'fail',
            message: 'Vendor not found',
        })
    }

    // Step 4: Fetch product counts for the vendor using aggregation pipeline
    const [productCounts] = await Product.aggregate([
        { $match: { userId: vendorId } }, // Match products for the vendor
        {
            $facet: {
                approvedCount: [
                    { $match: { status: 'approved' } },
                    { $count: 'approvedCount' },
                ],
                totalCount: [{ $count: 'totalCount' }],
                orderCount: [
                    { $unwind: '$orders' },
                    { $match: { 'orders.userId': vendorId } },
                    { $count: 'orderCount' },
                ],
            },
        },
    ])

    const approvedProducts =
        productCounts?.approvedCount?.[0]?.approvedCount || 0
    const totalProducts = productCounts?.totalCount?.[0]?.totalCount || 0
    const totalOrders = productCounts?.orderCount?.[0]?.orderCount || 0

    // Add the data to the vendor object
    vendor.approvedProducts = approvedProducts
    vendor.totalProducts = totalProducts
    vendor.totalOrders = totalOrders

    // Optional: Add reviews for the vendor (can be optimized)
    vendor.reviews = await ProductReview.find({
        product: { $in: vendor.products },
    }).lean()

    // Step 5: Build the response
    const response = {
        status: 'success',
        cached: false,
        doc: vendor,
    }

    // Step 6: Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response))

    // Step 7: Send the response
    res.status(200).json(response)
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

    // Step 1: Fetch the vendor based on the slug
    const vendor = await Vendor.findOne({ slug }).lean()

    if (!vendor) {
        return next(new AppError(`No Vendor found with that slug`, 404))
    }

    // Step 2: Fetch the product counts and order counts using aggregation pipeline
    const [productCounts] = await Product.aggregate([
        { $match: { userId: vendor._id } }, // Match products for the vendor
        {
            $facet: {
                approvedCount: [
                    { $match: { status: 'approved' } },
                    { $count: 'approvedCount' },
                ],
                totalCount: [{ $count: 'totalCount' }],
                orderCount: [
                    { $unwind: '$orders' },
                    { $match: { 'orders.userId': vendor._id } },
                    { $count: 'orderCount' },
                ],
            },
        },
    ])

    const approvedProducts =
        productCounts?.approvedCount?.[0]?.approvedCount || 0
    const totalProducts = productCounts?.totalCount?.[0]?.totalCount || 0
    const totalOrders = productCounts?.orderCount?.[0]?.orderCount || 0

    // Step 3: Fetch reviews for the vendor's products
    const reviews = await ProductReview.find({
        product: { $in: vendor.products },
    }).lean()

    // Step 4: Build the response data
    const doc = {
        ...vendor,
        reviews,
        approvedProducts,
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

    if (req.body.status === 'active') {
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
    const user = await Vendor.findById(req.user._id).select('+password')

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

// forgot password via email
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
        // const resetURL = `${process.env.DOMAIN_NAME}/users/resetPassword/${resetToken}`

        const resetURL = `https://seller.vistamart.biz/auth/reset-password/${resetToken}`

        // Get the user's IP address
        const ipAddress =
            req.headers['x-forwarded-for']?.split(',')[0] ||
            req.socket.remoteAddress

        const timestamp =
            new Date().toISOString().replace('T', ' ').substring(0, 16) + ' GMT'

        console.log(user.email, ipAddress, timestamp, resetURL)

        const message = await createPasswordResetMessage(
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

    await removeRefreshToken(user._id.toString())

    // Clear the refreshToken cookie on the client
    res.clearCookie('jwt')

    res.status(200).json({
        status: 'success',
        message: 'Password reset successfully.',
    })
})



export const forgotPasswordViaSMS = catchAsync(async (req, res, next) => {
    const { phone } = req.body;

    const vendor = await Vendor.findOne({ phoneNumber:phone });
    if (!vendor) {
        return next(new AppError('Vendor with this phone number not found', 404));
    }

    // Generate and save OTP
    const { token, hash } = otpService.generateOTP();
    await otpService.saveOTP(null,phone, hash);

    // Send OTP via SMS
    await otpService.otpSMSSend(phone, token);

    res.status(200).json({
        status: 'success',
        message: 'OTP sent to your registered phone number.',
    });
});

export const resetVendorPasswordViaOTP = catchAsync(async (req, res, next) => {
    const { phone, otp, passwordNew, passwordConfirm } = req.body;
    if (passwordNew !== passwordConfirm) {
        return next(new AppError('Passwords do not match!', 400));
    }
const otpEntry = await OTP.findOne({ phone });

if (!otpEntry) {
    return next(new AppError('Invalid or expired OTP', 400));
}
    const isValidOTP = await otpService.validateOTP(otp, otpEntry.hash);
    if (!isValidOTP) {
        return next(new AppError('Invalid or expired OTP', 400));
    }

    // 3) Find the vendor
    const vendor = await Vendor.findOne({ phoneNumber :phone});
    if (!vendor) {
        return next(new AppError('Vendor with this phone number not found', 404));
    }

    // 4) Update the vendor's password
    vendor.password = passwordNew;
    vendor.passwordChangedAt = Date.now();
    await vendor.save();
    res.status(200).json({
        status: 'success',
        message: 'Password reset successfully.',
    });
});

export const validateOTPHandler = catchAsync(async (req, res, next) => {
    const { phone, otp } = req.body;
    
    // Retrieve the OTP entry for the user
    const otpEntry = await OTP.findOne({ phone });
    
    if (!otpEntry) {
        return next(new AppError('OTP not found or expired!', 400));
    }

    // Validate OTP
    const isValidOTP = await otpService.validateOTP(otp, otpEntry.hash);
    console.log("is valid otp ", isValidOTP)
    if (!isValidOTP) {
        return next(new AppError('Invalid or expired OTP', 400));
    }

    // If OTP is valid, proceed with sending the success response and show password fields
    res.status(200).json({
        status: 'success',
        message: 'OTP validated successfully. You can now reset your password.',
    });
});


