import Category from '../../../models/admin/categories/categoryModel.js'
import slugify from 'slugify'
import {
    deleteOne,
    updateOne,
    updateStatus,
} from '../../../factory/handleFactory.js'

import catchAsync from '../../../utils/catchAsync.js'
import { getCacheKey } from '../../../utils/helpers.js'
import redisClient from '../../../config/redisConfig.js'

import SubCategory from '../../../models/admin/categories/subCategoryModel.js'
import SubSubCategory from '../../../models/admin/categories/subSubCategoryModel.js'
import Product from './../../../models/sellers/productModel.js'
import Order from '../../../models/transactions/orderModel.js'
import APIFeatures from '../../../utils/apiFeatures.js'
import AppError from '../../../utils/appError.js'
import { deleteKeysByPattern } from '../../../services/redisService.js'

// Create a new category
export const createCategory = catchAsync(async (req, res) => {
    const { name, priority, logo } = req.body

    const slug = slugify(name, { lower: true })

    const category = new Category({ name, logo, priority, slug })
    await category.save()

    if (!category) {
        return res.status(400).json({
            status: 'fail',
            message: `Category could not be created`,
        })
    }

    await deleteKeysByPattern('Category')

    const cacheKeyOne = getCacheKey('Category', category?._id)
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(category))

    res.status(201).json({
        status: 'success',
        doc: category,
    })
})

// export const getCategories = getAll(Category, {
//     path: [
//         'productCount',
//         {
//             path: 'subCategories',
//             select: '_id name slug',
//         },
//         {
//             path: 'subSubCategories',
//             select: '_id name slug',
//         },
//     ],
// })

// Get a single category by ID

export const getCategories = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('Category', '', req.query)

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
    let query = Category.find()

    // Apply filters, sorting, field limiting, and pagination
    const features = new APIFeatures(query, req.query)
        .filter()
        .sort()
        .fieldsLimit()
        .paginate()

    // Fetch all categories
    const categories = await features.query.lean()

    // Fetch products and total orders for each category
    const categoriesWithProductsAndOrders = await Promise.all(
        categories.map(async (category) => {
            // Step 1: Fetch all products for the category
            const products = await Product.find({
                category: category._id, // Match products by the category ID
            }).lean()

            const totalProducts = products?.length || 0

            // Step 2: Extract product IDs
            const productIds = products.map((product) => product._id)

            // Step 3: Count the total number of orders for these products
            const totalOrders = await Order.countDocuments({
                products: { $in: productIds }, // Match orders that contain any of the product IDs
            }).lean()

            // Step 4: Add products and totalOrders to the category object
            return {
                ...category,
                products, // Array of products in this category
                totalOrders, // Total number of orders for these products
                totalProducts,
            }
        })
    )

    // Cache the result
    await redisClient.setEx(
        cacheKey,
        3600,
        JSON.stringify(categoriesWithProductsAndOrders)
    )

    res.status(200).json({
        status: 'success',
        cached: false,
        results: categoriesWithProductsAndOrders.length,
        doc: categoriesWithProductsAndOrders,
    })
})

export const getCategoryById = catchAsync(async (req, res, next) => {
    const categoryId = req.params.id
    const cacheKey = getCacheKey('Category', categoryId)

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
    let doc = await Category.findById(categoryId).lean()

    if (!doc) {
        return next(new AppError(`No category found with that ID`, 404))
    }

    // Step 1: Fetch total products for the categor
    const products = await Product.find({
        category: categoryId, // Match products with the given categor ID
    }).lean()

    const totalProducts = products?.length || 0

    // Extract product IDs from the products
    const productIds = products.map((product) => product._id)

    // Step 3: Fetch total orders that contain these products
    const totalOrders = await Order.countDocuments({
        products: { $in: productIds }, // Match orders that contain any of the product IDs
    }).lean()

    doc = {
        ...doc,
        products,
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

// Update a category by ID
export const updateCategory = updateOne(Category)
// Delete a category by ID
// Define related models and their foreign keys
const relatedModels = [
    { model: SubCategory, foreignKey: 'mainCategory' },
    { model: SubSubCategory, foreignKey: 'mainCategory' },
    // { model: Product, foreignKey: 'category' },
]

// Delete a category by ID
// export const deleteCategory = deleteOneWithTransaction(Category, relatedModels);
export const deleteCategory = deleteOne(Category)

// Get category by slug
export const getCategoryBySlug = catchAsync(async (req, res, next) => {
    const slug = req.params.slug
    const cacheKey = getCacheKey('Category', slug)

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
    let doc = await Category.findOne({ slug }).lean()

    if (!doc) {
        return next(new AppError(`No category found with that slug`, 404))
    }

    const categoryId = doc._id

    // Step 1: Fetch total products for the categor
    const products = await Product.find({
        category: categoryId, // Match products with the given categor ID
    }).lean()

    const totalProducts = products?.length || 0

    // Extract product IDs from the products
    const productIds = products.map((product) => product._id)

    // Step 3: Fetch total orders that contain these products
    const totalOrders = await Order.countDocuments({
        products: { $in: productIds }, // Match orders that contain any of the product IDs
    }).lean()

    doc = {
        ...doc,
        products,
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

export const updateCategoryStatus = updateStatus(Category)
