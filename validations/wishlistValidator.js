import Joi from 'joi'

const wishlistValidationSchema = Joi.object({
    customerId: Joi.string().required().messages({
        'any.required': 'Customer ID is required',
        'string.base': 'Customer ID must be a string',
        'string.empty': 'Customer ID cannot be empty.',
    }),
    productId: Joi.string().required().messages({
        'any.required': 'Product ID is required',
        'any.base': 'Product ID must be a string',
        'string.empty': 'Product ID cannot be empty.',
    }),
})

export default wishlistValidationSchema
