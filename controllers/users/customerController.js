import redisClient from '../../config/redisConfig.js'
import Customer from '../../models/users/customerModel.js'
import catchAsync from '../../utils/catchAsync.js'
import { getCacheKey } from '../../utils/helpers.js'
import {
    createOne,
    deleteOne,
    getAll,
    getOne,
    updateOne,
    updateStatus,
} from '../../factory/handleFactory.js'

export const createCustomer = createOne(Customer)
export const getCustomers = getAll(Customer)
export const getCustomer = getOne(Customer)
export const deleteCustomer = deleteOne(Customer)

export const updateCustomer = catchAsync(async (req, res, next) => {
    const {
        firstName,
        lastName,
        email,
        phoneNumber,
        status,
        permanentAddress,
        officeShippingAddress,
        officeBillingAddress,
    } = req.body

    const data = {
        firstName,
        lastName,
        email,
        phoneNumber,
        status,
        permanentAddress,
        officeShippingAddress,
        officeBillingAddress,
    }

    // Perform the update operation
    const customer = await Customer.findByIdAndUpdate(req.params.id, data, {
        new: true,
        runValidators: true,
    })

    // Handle case where the document was not found
    if (!customer) {
        return next(new AppError(`No customer found with that ID`, 404))
    }

    const cacheKeyOne = getCacheKey('Customer', req.params.id)

    // delete pervious document data
    await redisClient.del(cacheKeyOne)
    // updated the cache with new data
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(customer))

    // Update cache
    const cacheKey = getCacheKey('Customer', '', req.query)
    await redisClient.del(cacheKey)

    res.status(200).json({
        status: 'success',
        doc: customer,
    })
})

export const updateCustomerStatus = updateStatus(Customer)
