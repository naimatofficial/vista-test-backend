import catchAsync from '../../utils/catchAsync.js'
import { getAll, updateStatus, deleteOne } from '../../factory/handleFactory.js'
import { getCacheKey } from '../../utils/helpers.js'
import redisClient from '../../config/redisConfig.js'
import slugify from 'slugify'
import AppError from '../../utils/appError.js'

import Product from '../../models/sellers/productModel.js'
import Vendor from '../../models/sellers/vendorModel.js'
import Brand from '../../models/admin/brandModel.js'
import Category from '../../models/admin/categories/categoryModel.js'
import ProductReview from '../../models/users/productReviewModel.js'
import Order from '../../models/transactions/orderModel.js'
import Employee from '../../models/admin/employeeModel.js'
import { deleteKeysByPattern } from '../../services/redisService.js'

// Create a new product
export const createProduct = catchAsync(async (req, res, next) => {
    let {
        name,
        description,
        category,
        subCategory,
        subSubCategory,
        brand,
        productType,
        digitalProductType,
        sku,
        unit,
        tags,
        price,
        discount,
        discountType,
        discountAmount,
        taxAmount,
        taxIncluded,
        minimumOrderQty,
        shippingCost,
        stock,
        colors,
        thumbnail,
        images,
        attributes,
        videoLink,
        metaTitle,
        metaDescription,
        userId,
        userType,
    } = req.body

    if (userType === 'vendor') {
        const user = await Vendor.findById(userId)
        if (!user) {
            return next(new AppError('Referenced vendor does not exist', 400))
        }
    } else if (userType === 'in-house') {
        const user = await Employee.findById(userId)
        if (!user) {
            return next(new AppError('Referenced user does not exist', 400))
        }
    } else {
        return next(new AppError('Invalid userType provided', 400))
    }

    // Calculate updated discount amount
    discountAmount =
        discountType === 'percent' ? (price * discount) / 100 : discountAmount

    let productData = {
        name,
        description,
        category,
        subCategory,
        subSubCategory,
        brand,
        productType,
        sku,
        unit,
        tags,
        price,
        discount,
        discountType,
        discountAmount,
        taxAmount,
        taxIncluded,
        minimumOrderQty,
        shippingCost,
        stock,
        thumbnail,
        images,
        colors,
        attributes,
        videoLink,
        userId,
        userType,
        metaTitle,
        metaDescription,
        slug: slugify(name, { lower: true }),
    }

    if (productType === 'digital') {
        productData = {
            ...productData,
            digitalProductType,
        }
    }

    const newProduct = new Product(productData)

    await newProduct.save()

    // delete all document caches related to this model
    await deleteKeysByPattern('Product')

    res.status(201).json({
        status: 'success',
        doc: newProduct,
    })
})

// export const getAllProducts = catchAsync(async (req, res, next) => {
//     const cacheKey = getCacheKey('Product', '', req.query)

//     // Check cache first
//     const cachedDoc = await redisClient.get(cacheKey)
//     if (cachedDoc) {
//         return res.status(200).json({
//             status: 'success',
//             cached: true,
//             results: JSON.parse(cachedDoc).length,
//             doc: JSON.parse(cachedDoc),
//         })
//     }

//     // Base query for products
//     let query = Product.find()

//     // Check if any query parameter for sorting, filtering, limiting, or pagination is present
//     const { sort, limit, page, ...filters } = req.query
//     const hasQueryOptions =
//         sort || limit || page || Object.keys(filters).length > 0

//     // Apply query options if present
//     let products
//     if (hasQueryOptions) {
//         const features = new APIFeatures(query, req.query)
//             .filter()
//             .sort()
//             .fieldsLimit()
//             .paginate()

//         products = await features.query.lean()
//     } else {
//         products = await Product.find().lean()
//     }

//     // Get unique IDs for related data
//     const categoryIds = [
//         ...new Set(products.map((p) => p.category).filter(Boolean)),
//     ]
//     const brandIds = [...new Set(products.map((p) => p.brand).filter(Boolean))]

//     // Fetch related data from separate databases
//     const [categories, brands] = await Promise.all([
//         Category.find({ _id: { $in: categoryIds } })
//             .select('name logo')
//             .lean(),
//         Brand.find({ _id: { $in: brandIds } })
//             .select('name logo')
//             .lean(),
//     ])

//     // Convert to maps for faster lookups
//     const categoryMap = Object.fromEntries(
//         categories.map((cat) => [cat._id.toString(), cat])
//     )
//     const brandMap = Object.fromEntries(
//         brands.map((brand) => [brand._id.toString(), brand])
//     )

//     // Enrich products with related data
//     const enrichedProducts = products.map((product) => ({
//         ...product,
//         category: categoryMap[product.category?.toString()] || null,
//         brand: brandMap[product.brand?.toString()] || null,
//     }))

//     // Cache the result
//     await redisClient.setEx(cacheKey, 3600, JSON.stringify(enrichedProducts))

//     res.status(200).json({
//         status: 'success',
//         cached: false,
//         results: enrichedProducts.length,
//         doc: enrichedProducts,
//     })
// })

export const getAllProducts = getAll(Product)

// Update product details
export const updateProduct = catchAsync(async (req, res, next) => {
    const { id: productId } = req.params

    if (!productId) {
        return next(new AppError('Product ID is required', 400))
    }

    // Initialize the fields for update based on provided inputs
    const updateFields = {}

    // Populate `updateFields` only with provided fields
    for (const key of Object.keys(req.body)) {
        if (req.body[key] !== undefined) {
            updateFields[key] = req.body[key]
        }
    }

    // Conditionally calculate discount if required fields are provided
    if (
        updateFields.price !== undefined &&
        updateFields.discount !== undefined &&
        updateFields.discountType
    ) {
        updateFields.discountAmount =
            updateFields.discountType === 'percent'
                ? (updateFields.price * updateFields.discount) / 100
                : updateFields.discountAmount
    }

    // Set slug only if `name` is provided
    if (updateFields.name) {
        updateFields.slug = slugify(updateFields.name, { lower: true })
    }

    // Perform update with Mongoose and handle response
    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateFields,
        {
            new: true,
            runValidators: true,
        }
    )

    if (!updatedProduct) {
        return next(new AppError('No product found with that ID', 404))
    }

    await deleteKeysByPattern('Product')

    res.status(200).json({
        status: 'success',
        doc: updatedProduct,
    })
})

export const getProductById = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('Product', req.params.id)

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
    let product = await Product.findById(req.params.id).lean()

    if (!product) {
        return next(new AppError(`No Product found with that Id.`, 404))
    }

    const category = await Category.findById(product.category).lean()
    const brand = await Brand.findById(product.brand).lean()

    let productReviews = await ProductReview.find({
        product: product._id,
    }).lean()

    let orders = await Order.find({
        product: product._id,
    }).lean()

    // If no reviews are found, initialize with an empty array
    if (!productReviews || productReviews.length === 0) {
        productReviews = []
    }

    const totalOrders = orders?.length || 0

    // Add reviews (empty array if none found)
    product = {
        ...product,
        category,
        brand,
        orders,
        reviews: productReviews,
        totalOrders,
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(product))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc: product,
    })
})

export const getProductBySlug = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('Product', req.params.slug)

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
    let product = await Product.findOne({ slug: req.params.slug }).lean()

    if (!product) {
        return next(new AppError(`No Product found with that slug`, 404))
    }

    const category = await Category.findById(product.category).lean()
    const brand = await Brand.findById(product.brand).lean()

    let productReviews = await ProductReview.find({
        product: product._id,
    }).lean()

    let orders = await Order.find({
        product: product._id,
    }).lean()

    // If no reviews are found, initialize with an empty array
    if (!productReviews || productReviews.length === 0) {
        productReviews = []
    }

    const totalOrders = orders?.length || 0

    // Add reviews (empty array if none found)
    product = {
        ...product,
        category,
        brand,
        orders,
        reviews: productReviews,
        totalOrders,
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(product))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc: product,
    })
})

// Delete a Product
export const deleteProduct = deleteOne(Product)

// Update product status
export const updateProductStatus = updateStatus(Product)

// Update product featured status
export const updateProductFeaturedStatus = catchAsync(
    async (req, res, next) => {
        const productId = req.params.id
        const { isFeatured } = req.body

        // Perform the update operation
        const doc = await Product.findByIdAndUpdate(
            productId,
            { isFeatured },
            {
                new: true,
                runValidators: true,
            }
        )

        // Handle case where the document was not found
        if (!doc) {
            return next(new AppError(`No product found with that ID`, 404))
        }

        // delete all document caches related to this model
        await deleteKeysByPattern('Product')

        res.status(200).json({
            status: 'success',
            doc,
        })
    }
)
