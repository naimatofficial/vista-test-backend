import axios from 'axios'
import generateSecureHash from './../../utils/generateSecureHash.js'
import keys from './../../config/keys.js'
import moment from 'moment-timezone'
import catchAsync from '../../utils/catchAsync.js'
import AppError from '../../utils/appError.js'

const generateTxnRefNumber = () =>
    `T${new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '')}${
        Math.floor(Math.random() * 91) + 10
    }`

// Card Transaction: Page Redirection
export const initiateCardPayment = catchAsync(async (req, res, next) => {
    const { amount, description } = req.body
    // Unique transaction reference
    const txnRefNo =
        'T' +
        moment().tz('Asia/Karachi').format('YYYYMMDDHHmmss') +
        Math.floor(Math.random() * 1000)

    // Set transaction date-time to Pakistan time (GMT+5)
    const txnDateTime = moment().tz('Asia/Karachi').format('YYYYMMDDHHmmss')

    // Set expiration time to 3 dasy (72 hours) from now in Pakistan time (GMT+5)
    const txnExpiryDateTime = moment()
        .tz('Asia/Karachi')
        .add(72, 'hours')
        .format('YYYYMMDDHHmmss')

    const params = {
        pp_BillReference: 'billRef2343',
        pp_Amount: amount * 100,
        pp_Description: description,
        pp_Language: 'EN',
        pp_MerchantID: keys.jazzCashMerchantId,
        pp_Password: keys.jazzCashPassword,

        pp_Version: '1.1',
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: new Date().toISOString(),
        pp_TxnRefNo: txnRefNo,
        pp_TxnType: 'MPAY',
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: txnDateTime,
        pp_TxnExpiryDateTime: txnExpiryDateTime,
        pp_ReturnURL: keys.jazzCashReturnUrl,
        // pp_BankId: '',
        // pp_ProductId: '',
        ppmpf_1: '',
        ppmpf_2: '',
        ppmpf_3: '',
        ppmpf_4: '',
        ppmpf_5: '',
    }

    params.pp_SecureHash = generateSecureHash(
        params,
        keys.jazzCashIntegritySalt
    )

    if (!params.pp_SecureHash) {
        return next(new AppError('Secure Hash is not defined!', 400))
    }

    console.log(params)

    const redirectUrl = `${keys.jazzCashCardsPostUrl}?${new URLSearchParams(
        params
    ).toString()}`

    console.log(redirectUrl)

    // const response = await axios.post(keys.jazzCashCardsPostUrl, params)

    return res.status(200).json({ redirectUrl })

    // // Redirect to JazzCash with the generated URL

    // return res.status(200).json({ redirectUrl })
})

// Wallet Transaction using API v2.0
export const initiateWalletPayment = catchAsync(async (req, res, next) => {
    // JazzCash credentials (replace with your actual credentials)
    const { amount, cnic, phone, description } = req.body

    const txnRefNo =
        'T' +
        moment().tz('Asia/Karachi').format('YYYYMMDDHHmmss') +
        Math.floor(Math.random() * 1000)
    const txnDateTime = moment().tz('Asia/Karachi').format('YYYYMMDDHHmmss')
    const txnExpiryDateTime = moment()
        .tz('Asia/Karachi')
        .add(24, 'hours')
        .format('YYYYMMDDHHmmss')
    // const orderId = parseInt(uuid.replace(/-/g, '').slice(0, 4), 16)
    const billReference = `billRef2053`

    // Concatenate parameters for HMAC calculation in alphabetical order
    const params = {
        pp_Amount: amount * 100,
        pp_MerchantID: keys.jazzCashMerchantId,
        pp_SubMerchantID: '',
        pp_Password: keys.jazzCashPassword,
        pp_TxnRefNo: txnRefNo,
        pp_BillReference: billReference,
        pp_CNIC: cnic,
        pp_Description: description,
        pp_Language: 'EN',
        pp_MobileNumber: phone,

        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: txnDateTime,
        pp_TxnExpiryDateTime: txnExpiryDateTime,
        ppmpf_1: '',
        ppmpf_2: '',
        ppmpf_3: '',
        ppmpf_4: '',
        ppmpf_5: '',
    }

    params.pp_SecureHash = generateSecureHash(
        params,
        keys.jazzCashIntegritySalt
    )

    console.log(params)

    if (!params.pp_SecureHash) {
        return next(new AppError('Secure Hash is not defined!', 400))
    }

    const response = await axios.post(keys.jazzCashMobileWalletPostUrl, params)

    res.send(response.data)
})

// Handle JazzCash Response for Card Transactions
// Enhanced JazzCash Response Handler for Card Transactions
export const handleJazzCashResponse = (req, res) => {
    try {
        const {
            pp_ResponseCode,
            pp_SecureHash,
            pp_ResponseMessage,
            ...responseParams
        } = req.body

        console.log({ response: req.body })

        if (pp_ResponseCode === '000') {
            return res.status(200).json({
                message:
                    pp_ResponseMessage || 'Your transaction was successful.',
                data: responseParams,
            })
        } else {
            return res.status(400).json({
                message: pp_ResponseMessage || 'Your transaction was failed',
                data: responseParams,
            })
        }
    } catch (error) {
        console.error('Error handling response:', error)
        return res
            .status(500)
            .json({ error: 'Internal server error', details: error.message })
    }
}
