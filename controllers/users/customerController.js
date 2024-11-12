import Customer from '../../models/users/customerModel.js'
import catchAsync from '../../utils/catchAsync.js'
import {
    createOne,
    deleteOne,
    getAll,
    getOne,
    updateStatus,
} from '../../factory/handleFactory.js'
import { deleteKeysByPattern } from '../../services/redisService.js'
import ProductReview from '../../models/users/productReviewModel.js'

export const createCustomer = createOne(Customer)
export const getCustomers = getAll(Customer)
export const getCustomer = getOne(Customer)

export const deleteCustomer = catchAsync(async (req, res, next) => {
    const customer = await Customer.findByIdAndDelete(req.params.id).exec()

    // Handle case where the customer was not found
    if (!customer) {
        return next(new AppError(`No customer found with that ID`, 404))
    }

    // Delete all products associated with this customer
    // await ProductReview.deleteMany({ customer: req.params.id }).exec()

    await deleteKeysByPattern('Customer')

    res.status(204).json({
        status: 'success',
        doc: null,
    })
})

export const updateCustomer = catchAsync(async (req, res, next) => {
    const {
        firstName,
        lastName,
        email,
        phoneNumber,
        image,
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
        image,
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

    await deleteKeysByPattern('Customer')

    res.status(200).json({
        status: 'success',
        doc: customer,
    })
})

export const updateCustomerStatus = updateStatus(Customer)
