import mongoose from 'mongoose'
import { sellerDbConnection } from '../../config/dbConnections.js'

import Brand from '../admin/brandModel.js'
import Category from '../admin/categories/categoryModel.js'
import SubCategory from '../admin/categories/subCategoryModel.js'
import SubSubCategory from '../admin/categories/subSubCategoryModel.js'

import { checkReferenceId } from '../../utils/helpers.js'

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide Product name'],
            trim: true,
            maxlength: [100, 'Product name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Please provide Product description'],
            trim: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Please provide Category'],
        },
        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubCategory',
        },
        subSubCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubSubCategory',
        },
        brand: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brand',
            required: [true, 'Please provide Brand'],
        },
        productType: {
            type: String,
            required: [true, 'Please provide Product type'],
            enum: ['physical', 'digital'],
            default: 'physical',
        },
        digitalProductType: {
            type: String,
            enum: ['readyAfterSell', 'readyProduct'],
        },
        sku: {
            type: String,
            required: [true, 'Please provide SKU'],
        },
        unit: {
            type: String,
            required: [true, 'Please provide Unit'],
        },
        tags: [String],
        price: {
            type: Number,
            min: [0, 'Price cannot be negative'],
        },
        discount: {
            type: Number,
            min: [0, 'Discount cannot be negative'],
            max: [100, 'Discount cannot exceed 100%'],
            default: 0,
        },
        discountType: {
            type: String,
            enum: ['percent', 'flat'],
        },
        discountAmount: {
            type: Number,
            min: [0, 'Discount amount cannot be negative'],
            default: 0,
        },
        taxAmount: {
            type: Number,
            min: [0, 'Tax amount cannot be negative'],
            default: 0,
        },
        taxIncluded: {
            type: Boolean,
            default: false,
        },
        shippingCost: {
            type: Number,
            min: [0, 'Shipping cost cannot be negative'],
            default: 0,
        },
        minimumOrderQty: {
            type: Number,
            required: [true, 'Please provide Minimum Order Quantity'],
            min: [1, 'Minimum order quantity must be at least 1'],
        },
        stock: {
            type: Number,
            required: [true, 'Please provide Stock quantity'],
            min: [0, 'Stock cannot be negative'],
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        colors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Color',
            },
        ],
        attributes: [
            {
                attribute: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Attribute',
                },
                price: {
                    type: Number,
                    min: [0, 'Attribute price cannot be negative'],
                },
            },
        ],
        thumbnail: String,
        images: [String],
        videoLink: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Please provide user ID'],
        },
        userType: {
            type: String,
            enum: ['vendor', 'in-house'],
            required: [true, 'Please provide user type'],
        },
        slug: String,
        sold: {
            type: Number,
            default: 0,
        },
        rating: {
            type: Number,
            min: [0, 'Rating cannot be negative'],
            max: [5, 'Rating cannot exceed 5'],
            default: 0,
        },
        numOfReviews: {
            type: Number,
            min: [0, 'Number of reviews cannot be negative'],
            default: 0,
        },
        metaTitle: {
            type: String,
            maxlength: [60, 'Meta title cannot exceed 60 characters'],
        },
        metaDescription: {
            type: String,
            maxlength: [160, 'Meta description cannot exceed 160 characters'],
        },
    },
    { timestamps: true }
)

productSchema.pre('save', async function (next) {
    try {
        await checkReferenceId(Category, this.category, next)
        await checkReferenceId(Brand, this.brand, next)

        if (this.subCategory) {
            await checkReferenceId(SubCategory, this.subCategory, next)

            if (this.SubSubCategory) {
                await checkReferenceId(
                    SubSubCategory,
                    this.subSubCategory,
                    next
                )
            }
        }

        next()
    } catch (error) {
        return next(error)
    }
})

const Product = sellerDbConnection.model('Product', productSchema)

export default Product
