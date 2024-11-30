import Brand from '../../models/admin/brandModel.js'
import Category from '../../models/admin/categories/categoryModel.js'
import Product from '../../models/sellers/productModel.js'

import AppError from '../../utils/appError.js'
import catchAsync from '../../utils/catchAsync.js'

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
