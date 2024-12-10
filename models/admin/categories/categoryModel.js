import mongoose from 'mongoose'
import { adminDbConnection } from '../../../config/dbConnections.js'

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide category name.'],
            unique: true,
            trim: true,
        },
        logo: {
            type: String,
            required: [true, 'Please provide category logo.'],
        },
        priority: Number,
        slug: String,

        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'inactive',
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
    }
)

categorySchema.index({ name: 'text' })

// Virtual to count products associated with the category
categorySchema.virtual('productCount', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category',
})

// Virtual field to populate subcategories and sub-subcategories
// categorySchema.virtual('subCategories', {
//     ref: 'SubCategory',
//     localField: '_id',
//     foreignField: 'mainCategory',
// })

// categorySchema.virtual('subSubCategories', {
//     ref: 'SubSubCategory',
//     localField: '_id',
//     foreignField: 'mainCategory',
// })

const Category = adminDbConnection.model('Category', categorySchema)

export default Category
