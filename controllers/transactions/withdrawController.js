import {
    checkFields,
    deleteOne,
    getAll,
    getOne,
    updateStatus,
} from '../../factory/handleFactory.js'
import AdminWallet from '../../models/transactions/adminWalletModel.js'
import Withdraw from '../../models/transactions/withdrawModel.js'
import { deleteKeysByPattern } from '../../services/redisService.js'
import catchAsync from '../../utils/catchAsync.js'

export const createWithdrawRequest = catchAsync(async (req, res, next) => {
    const requestedBy = req.user._id

    // const { accountName, amount, accountProvider, accountNumber } = req.body

    const data = { ...req.body, requestedBy }

    console.log(data)

    if (data.amount <= 0) {
        return next(
            new AppError('Withdrawal amount must be greater than zero.', 400)
        )
    }

    // Filter and sanitize the input
    let { filteredData } = checkFields(Withdraw, req, next)

    // Create the withdrawal request
    const doc = await Withdraw.create(filteredData)

    if (!doc) {
        return next(
            new AppError(
                'Withdraw request could not be created. Please try again later.',
                500
            )
        )
    }

    // Clear relevant cache
    await deleteKeysByPattern('Withdraw')

    // Send response
    res.status(201).json({
        status: 'success',
        message: 'Withdraw request created successfully.',
        doc,
    })
})

// Get all vendors
export const getAllWithdraws = getAll(Withdraw)

// Get vendor by ID
export const getWithdrawById = getOne(Withdraw)

// Delete vendor by ID
export const deleteWithdraw = deleteOne(Withdraw)

export const updateWithdrawRequestStatus = catchAsync(
    async (req, res, next) => {
        const { status, note, image, vendorId } = req.body

        if (status === 'Approved') {
            const adminWallet = await AdminWallet.findOne({ vendor: vendorId })
        }
        const doc = await Withdraw.findByIdAndUpdate(
            req.params.id,
            filteredData,
            {
                new: true,
                runValidators: true,
            }
        )

        // Handle case where the document was not found
        if (!doc) {
            return next(new AppError(`No withdraw found with that ID`, 404))
        }

        // delete all document caches related to this model
        await deleteKeysByPattern('Withdraw')
        await deleteKeysByPattern('SellerWallet')
        await deleteKeysByPattern('AdminWallet')

        res.status(200).json({
            status: 'success',
            doc,
        })
    }
)

export const updateWithdrawStatus = updateStatus(Withdraw)
