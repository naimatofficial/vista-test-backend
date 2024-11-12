import { updateStatus } from '../../factory/handleFactory.js'
import catchAsync from '../../utils/catchAsync.js'
import AppError from '../../utils/appError.js'
import { getCacheKey } from '../../utils/helpers.js'
import redisClient from '../../config/redisConfig.js'
import Vendor from '../../models/sellers/vendorModel.js'
import slugify from 'slugify'
import ProductReview from '../../models/users/productReviewModel.js'
import Order from '../../models/transactions/orderModel.js'
import APIFeatures from '../../utils/apiFeatures.js'
import { deleteKeysByPattern } from '../../services/redisService.js'
import Product from '../../models/sellers/productModel.js'
import VendorBank from '../../models/sellers/vendorBankModel.js'

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
export const updateVendorStatus = updateStatus(Vendor)
