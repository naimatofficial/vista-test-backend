import redisClient from '../../config/redisConfig.js'
import Brand from '../../models/admin/brandModel.js'
import Category from '../../models/admin/categories/categoryModel.js'
import Product from '../../models/sellers/productModel.js'
import APIFeatures from '../../utils/apiFeatures.js'

import AppError from '../../utils/appError.js'
import catchAsync from '../../utils/catchAsync.js'
import { getCacheKey } from '../../utils/helpers.js'

// Controller for advanced search
export const advancedSearch = catchAsync(async (req, res, next) => {
    const { query } = req.query

    if (!query) {
        return next(new AppError('Search query is required', 400))
    }

    const searchRegex = new RegExp(query, 'i')

    // Fetch active brands
    const brands = await Brand.find({
        name: searchRegex,
        // status: 'active',
    }).select('name logo status')

    // Fetch active categories
    const categories = await Category.find({
        name: searchRegex,
        // status: 'active',
    }).select('name status')

    // Fetch approved products
    const products = await Product.find({
        name: searchRegex,
        approved: true,
    })
        .populate('category', 'name')
        .populate('brand', 'name')
        .select('name price stock status')

    const searchResults = {
        brands,
        categories,
        products,
    }

    const totalResults = Object.values(searchResults).reduce(
        (acc, curr) => acc + (curr?.length || 0),
        0
    )

    console.log(totalResults)

    res.status(200).json({
        status: 'success',
        results: totalResults,
        doc: searchResults,
    })
})

// export const searchAll = catchAsync(async (req, res, next) => {
//     const { query } = req.query

//     if (!query) {
//         return res.status(400).json({
//             status: 'fail',
//             message: 'Search query is required',
//         })
//     }

//     // Define search options for each collection
//     const searchOptions = {
//         $regex: query,
//         $options: 'i', // case-insensitive search
//     }

//     // Perform parallel searches for better performance
//     const [products, brands, categories, subcategories] = await Promise.all([
//         Product.find({ name: searchOptions })
//             .limit(10)
//             .select(
//                 'name description slug thumbnail price discountAmount rating numOfReviews'
//             ),
//         Brand.find({ name: searchOptions }).limit(5).select('name slug logo'),
//         Category.find({ name: searchOptions })
//             .limit(5)
//             .select('name slug icon'),
//         SubCategory.find({ name: searchOptions })
//             .limit(5)
//             .select('name slug icon'),
//     ])

//     // Combine results into a unified response
//     const results = {
//         products,
//         brands,
//         categories,
//         subcategories,
//     }

//     res.status(200).json({
//         status: 'success',
//         totalProducts: products.length,
//         totalResults:
//             products.length +
//             brands.length +
//             categories.length +
//             subcategories.length,
//         results,
//     })
// })

// export const searchAll = catchAsync(async (req, res, next) => {
//     const { query, limit = 10, page = 1 } = req.query

//     if (!query) {
//         return res
//             .status(400)
//             .json({ status: 'fail', message: 'Search query is required' })
//     }

//     const offset = (page - 1) * limit

//     // Execute parallel queries with limits
//     const [products, brands, categories, subcategories] = await Promise.all([
//         Product.find({ $text: { $search: query } })
//             .skip(offset)
//             .limit(limit)
//             .select(
//                 'name description slug thumbnail price discountAmount rating numOfReviews'
//             ),
//         Brand.find({ name: { $regex: query, $options: 'i' } })
//             .skip(offset)
//             .limit(limit)
//             .select('name slug'),
//         Category.find({ name: { $regex: query, $options: 'i' } })
//             .skip(offset)
//             .limit(limit)
//             .select('name slug'),
//         SubCategory.find({ name: { $regex: query, $options: 'i' } })
//             .skip(offset)
//             .limit(limit)
//             .select('name slug'),
//     ])

//     res.status(200).json({
//         status: 'success',
//         totalResults:
//             products.length +
//             brands.length +
//             categories.length +
//             subcategories.length,
//         results: { products, brands, categories, subcategories },
//     })
// })

export const searchAll = catchAsync(async (req, res, next) => {
    const { query, limit = 5, page = 1 } = req.query

    if (!query) {
        return res.status(400).json({
            status: 'fail',
            message: 'Search query is required',
        })
    }

    const offset = (page - 1) * limit
    const cacheKey = `cache:Search:${query}:${page}:${limit}`

    // Check Redis cache
    const cachedResults = await redisClient.get(cacheKey)

    if (cachedResults) {
        return res.status(200).json({
            ...JSON.parse(cachedResults),
            status: 'success',
            cached: true,
        })
    }

    // MongoDB Aggregation for search
    const results = await Promise.all([
        // Search products
        Product.aggregate([
            {
                $match: {
                    name: { $regex: query, $options: 'i' },
                },
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    slug: 1,
                    thumbnail: 1,
                },
            },
            { $limit: limit },
            { $skip: offset },
        ]),

        // Search brands
        Brand.aggregate([
            {
                $match: {
                    name: { $regex: query, $options: 'i' },
                },
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                },
            },
            { $limit: limit },
            { $skip: offset },
        ]),

        // Search categories
        Category.aggregate([
            {
                $match: {
                    name: { $regex: query, $options: 'i' },
                },
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                },
            },
            { $limit: limit },
            { $skip: offset },
        ]),
    ])

    const [products, brands, categories] = results

    // Combine results
    const combinedResults = [
        ...products.map((product) => ({ type: 'product', ...product })),
        ...brands.map((brand) => ({ type: 'brand', ...brand })),
        ...categories.map((category) => ({ type: 'category', ...category })),
    ]

    const response = {
        status: 'success',
        cached: false,
        totalResults: combinedResults.length,
        results: combinedResults,
    }

    // Cache the response
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response))

    res.status(200).json(response)
})

// export const searchProducts = catchAsync(async (req, res) => {
//     // Extract query parameters with defaults
//     const { type, query, page = 1, limit = 10 } = req.query

//     // Ensure valid pagination inputs
//     const pageNum = Math.max(parseInt(page, 10) || 1, 1)
//     const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50)

//     // Build filters
//     const filters = {}
//     if (type) filters.type = type
//     if (query) filters.name = { $regex: query, $options: 'i' }

//     // Fetch total count and paginated products
//     const totalProducts = await Product.countDocuments(filters)
//     const products = await Product.find(filters)
//         .skip((pageNum - 1) * limitNum) // Skip previous pages
//         .limit(limitNum) // Limit to specified number
//         .lean() // Optimize query response
//     // .select('name description thumbnail price slug rating, ') // Fetch only necessary fields

//     res.status(200).json({
//         status: 'success',
//         totalProducts,
//         totalPages: Math.ceil(totalProducts / limitNum),
//         currentPage: pageNum,
//         doc: products,
//     })
// })

export const searchProducts = catchAsync(async (req, res) => {
    const cacheKey = getCacheKey('cache:Search', '', req.query)

    // Check cache first
    const cachedResults = await redisClient.get(cacheKey)

    if (cachedResults) {
        return res.status(200).json({
            ...JSON.parse(cachedResults),
            status: 'success',
            cached: true,
        })
    }

    // Extract query parameters with defaults
    const { query, sort, limit, page, ...filters } = req.query

    // Ensure valid pagination inputs
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50)

    if (query) {
        filters.name = { $regex: query, $options: 'i' } // Search by name
    }

    let baseQuery = Product.find()

    // Step 1: Create an instance of APIFeatures
    const features = new APIFeatures(baseQuery, req.query)
        .filter()
        .sort()
        .fieldsLimit()

    // Step 2: Count total documents (before pagination)
    const totalProducts = await features.query.clone().countDocuments()

    // Step 3: Apply pagination and execute query
    features.paginate()
    const products = await features.query

    const response = {
        status: 'success',
        cached: false,
        totalProducts,
        totalPages: Math.ceil(totalProducts / limitNum),
        currentPage: pageNum,
        doc: products,
    }

    // Cache the response
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response))

    res.status(200).send(response)
})
