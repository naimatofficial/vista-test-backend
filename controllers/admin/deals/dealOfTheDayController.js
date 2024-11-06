import DealOfTheDay from '../../../models/admin/deals/dealOfTheDayModel.js'
import {
    createOne,
    updateOne,
    deleteOne,
} from '../../../factory/handleFactory.js'
import Product from '../../../models/sellers/productModel.js'
import catchAsync from '../../../utils/catchAsync.js'
import { getCacheKey } from '../../../utils/helpers.js'
import redisClient from '../../../config/redisConfig.js'
import AppError from '../../../utils/appError.js'

// Create a Deal of the Day
export const createDealOfTheDay = createOne(DealOfTheDay)

// Get all Deals of the Day with logging
export const getAllDealsOfTheDay = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('DealOfTheDay')

    const cachedDoc = await redisClient.get(cacheKey)

    if (cachedDoc) {
        return res.status(200).json({
            status: 'success',
            cached: true,
            docs: JSON.parse(cachedDoc),
        })
    }

    let docs
    try {
        docs = await DealOfTheDay.find().lean()
    } catch (error) {
        return next(
            new AppError('Failed to fetch deals from the database', 500)
        )
    }

    if (!docs || docs.length === 0) {
        return next(new AppError(`No Deals of the Day found`, 404))
    }

    // Fetch associated products for each deal
    for (let i = 0; i < docs.length; i++) {
        const productId = docs[i].product

        let product
        try {
            product = await Product.findById(productId).lean()
            if (product) {
                docs[i].products = [product] // Make sure to use 'products'
            } else {
                docs[i].products = [] // Use 'products' in the response
            }
        } catch (error) {
            docs[i].products = []
        }
    }

    // Return the response
    res.status(200).json({
        status: 'success',
        cached: false,
        docs,
    })
})

export const getDealOfTheDayById = catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey('DealOfTheDay', req.params.id)

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
    let doc = await DealOfTheDay.findById(req.params.id).lean()

    if (!doc) {
        return next(new AppError(`No Deal Of The Day found with that ID`, 404))
    }

    // Fetch associated products using product IDs in the Deal of the Day document
    let product = await Product.findById(doc.product).lean()

    // If no products are found, initialize with an empty array
    if (!product) {
        product = doc.product
    }

    // Add products to the Deal of the Day document
    doc = {
        ...doc,
        product,
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc))

    res.status(200).json({
        status: 'success',
        cached: false,
        doc,
    })
})

// Update Deal of the Day
export const updateDealOfTheDay = updateOne(DealOfTheDay)
// Delete Deal of the Day
export const deleteDealOfTheDay = deleteOne(DealOfTheDay)
