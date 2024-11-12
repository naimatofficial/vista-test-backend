import AppError from '../../utils/appError.js'
import catchAsync from '../../utils/catchAsync.js'
import {
    deleteOne,
    getAll,
    getOne,
    updateOne,
    updateStatus,
} from './../../factory/handleFactory.js'

import ProductReview from './../../models/users/productReviewModel.js'
import Product from '../../models/sellers/productModel.js'
import { deleteKeysByPattern } from '../../services/redisService.js'

export const createProductReview = catchAsync(async (req, res, next) => {
    const { productId, review, rating } = req.body
    const userId = req.user._id

    const existingReview = await ProductReview.findOne({
        product: productId,
        customer: userId,
    })

    if (existingReview) {
        return next(
            new AppError('You have already reviewed this product.', 400)
        )
    }

    const productReview = await ProductReview.create({
        product: productId,
        customer: userId,
        review,
        rating,
    })

    if (!productReview) {
        return next(new AppError('Rating could not be created!', 400))
    }

    const product = await Product.findById(productId)

    const numOfReviews = product.numOfReviews + 1
    const productRating = (product.rating + rating) / numOfReviews

    product.numOfReviews = numOfReviews
    product.rating = productRating

    await product.save()

    await deleteKeysByPattern('Product')
    await deleteKeysByPattern('ProductReview')

    res.status(201).json({
        status: 'success',
        doc: productReview,
    })
})

export const getAllProductReviews = getAll(ProductReview)

export const updateProductReviewStatus = updateStatus(ProductReview)

// Delete an ProductReview
export const deleteProductReview = deleteOne(ProductReview)

export const updateProductReview = updateOne(ProductReview)

// Get ProductReview by ID
export const getProductReviewById = getOne(ProductReview)
