import bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import mongoose from 'mongoose'
import validator from 'validator'
import slugify from 'slugify'
import { sellerDbConnection } from '../../config/dbConnections.js'

const vendorSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'Please tell us your first name.'],
            trim: true,
        },
        lastName: {
            type: String,
            default: '',
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: [true, 'Please tell us your phone number.'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Please provide your email address.'],
            unique: true,
            lowercase: true,
            validate: [
                validator.isEmail,
                'Please provide a valid email address.',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please provide password.'],
            minlength: 8,
            select: false,
        },
        shopName: {
            type: String,
            required: [true, 'Please tell us shop name.'],
            trim: true,
        },
        address: {
            type: String,
            required: [true, 'Please provide your address.'],
            trim: true,
        },

        status: {
            type: String,
            enum: ['pending', 'active', 'inactive', 'rejected'],
            default: 'pending',
        },
        shopStatus: {
            type: Boolean,
            default: true,
        },
        vendorImage: {
            type: String,
        },
        logo: {
            type: String,
        },
        banner: {
            type: String,
        },
        role: {
            type: String,
            default: 'vendor',
        },
        slug: {
            type: String,
            unique: true,
        },
        passwordChangedAt: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true,
    }
)

vendorSchema.virtual('products', {
    ref: 'Product', // Reference the Product model
    localField: '_id', // Match the _id of the vendor
    foreignField: 'userId', // Match the userId field in the Product model
    justOne: false, // If you want an array of products
    // options: {
    //     match: { status: 'approved' }, // Filter only approved products
    // },
})

vendorSchema.virtual('bank', {
    ref: 'VendorBank',
    localField: '_id',
    foreignField: 'vendor',
    justOne: true,
    options: { select: 'holderName accountNumber bankName branch vendor ' },
})

vendorSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

vendorSchema.methods.changePasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changeTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        )

        return JWTTimestamp < changeTimestamp
    }
    // NO password changed
    return false
}

vendorSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    return resetToken
}

vendorSchema.pre('save', async function (next) {
    // Only work when the password is not modified
    if (!this.isModified('password')) return next()

    // Hash the password using cost of 12
    this.password = await bcrypt.hash(this.password, 12)

    next()
})

vendorSchema.pre('save', function (next) {
    if (!this.isModified('shopName')) return next()

    this.slug = slugify(this.shopName, { lower: true, strict: true })
    next()
})

const Vendor = sellerDbConnection.model('Vendor', vendorSchema)

export default Vendor
