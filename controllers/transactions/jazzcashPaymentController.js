import axios from 'axios'
import generateSecureHash from './../../utils/generateSecureHash.js'
import keys from './../../config/keys.js'
import moment from 'moment-timezone'
import catchAsync from '../../utils/catchAsync.js'

// Card Transaction: Page Redirection
export const initiateCardPayment = catchAsync((req, res, next) => {
    const { amount, description } = req.body
    // Unique transaction reference
    const txnRefNo = `T${Date.now()}`

    // Set transaction date-time to Pakistan time (GMT+5)
    const txnDateTime = moment().tz('Asia/Karachi').format('YYYYMMDDHHmmss')

    // Set expiration time to 3 dasy (72 hours) from now in Pakistan time (GMT+5)
    const txnExpiryDateTime = moment()
        .tz('Asia/Karachi')
        .add(72, 'hours')
        .format('YYYYMMDDHHmmss')

    const params = {
        pp_Amount: req.body.amount * 100,
        pp_MerchantID: keys.jazzCashMerchantId,
        pp_Password: keys.jazzCashPassword,
        pp_TxnCurrency: 'PKR',
        pp_TxnRefNo: `W${Date.now()}`,
        pp_TxnDateTime: new Date().toISOString(),
        pp_TxnType: 'MPAY',
        pp_Version: '1.1',
        pp_Language: 'EN',
        pp_TxnRefNo: txnRefNo,
        pp_Amount: amount * 100, // JazzCash requires amount in cents
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: txnDateTime,
        pp_BillReference: 'billRef',
        pp_Description: description,
        pp_TxnExpiryDateTime: txnExpiryDateTime,
        pp_ReturnURL: keys.jazzCashReturnUrl,
    }

    params.pp_SecureHash = generateSecureHash(
        params,
        keys.jazzCashIntegritySalt
    )

    // Redirect to JazzCash with the generated URL
    const redirectUrl = `${keys.jazzCashPostUrl}?${new URLSearchParams(
        params
    ).toString()}`

    res.status(200).json({ redirectUrl })
})

// Wallet Transaction using API v2.0
export const initiateWalletPayment = async (req, res) => {
    // JazzCash credentials (replace with your actual credentials)
    const MerchantID = 'YourMerchantID'
    const Password = 'YourPassword'
    const IntegritySalt = 'YourIntegritySalt'
    const PostURL =
        'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
    const ReturnURL = 'http://localhost:3000/payment-response'

    // Payment parameters
    const amount = req.body.amount * 100 // Amount in cents
    const txnRefNo =
        'T' +
        moment().tz('Asia/Karachi').format('YYYYMMDDHHmmss') +
        Math.floor(Math.random() * 1000)
    const txnDateTime = moment().tz('Asia/Karachi').format('YYYYMMDDHHmmss')
    const txnExpiryDateTime = moment()
        .tz('Asia/Karachi')
        .add(72, 'hours')
        .format('YYYYMMDDHHmmss')
    const description = 'Wallet Payment'
    const billReference = 'BILL123' // Customize as needed

    // Concatenate parameters for HMAC calculation in alphabetical order
    const params = {
        pp_Amount: amount,
        pp_BillReference: billReference,
        pp_Description: description,
        pp_Language: 'EN',
        pp_MerchantID: MerchantID,
        pp_Password: Password,
        pp_ReturnURL: ReturnURL,
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: txnDateTime,
        pp_TxnExpiryDateTime: txnExpiryDateTime,
        pp_TxnRefNo: txnRefNo,
        pp_TxnType: 'MWALLET', // Type for wallet transactions
        pp_Version: '1.1',
    }

    // Generate sorted concatenated string for HMAC
    const sortedParams = Object.keys(params)
        .sort()
        .map((key) => params[key])
        .join('&')
    const hashString = IntegritySalt + '&' + sortedParams

    // Calculate secure hash
    const secureHash = crypto
        .createHmac('sha256', IntegritySalt)
        .update(hashString)
        .digest('hex')

    // Send form data to JazzCash
    const formData = {
        ...params,
        pp_SecureHash: secureHash,
    }

    // Redirect to JazzCash
    res.status(200).json({ formData, redirectURL: PostURL })

    // try {
    //     const response = await axios.post(keys.walletApiUrl, params)
    //     if (response.data.pp_ResponseCode === '000') {
    //         res.json({
    //             success: true,
    //             message: 'Transaction successful',
    //             data: response.data,
    //         })
    //     } else {
    //         res.json({
    //             success: false,
    //             message: 'Transaction failed',
    //             data: response.data,
    //         })
    //     }
    // } catch (error) {
    //     res.status(500).json({ success: false, message: error.message })
    // }
}

// Handle JazzCash Response for Card Transactions
export const handleJazzCashResponse = (req, res) => {
    const { pp_ResponseCode, ...responseParams } = req.body
    const responseHash = req.body.pp_SecureHash
    const calculatedHash = generateSecureHash(
        responseParams,
        keys.integritySalt
    )

    if (responseHash === calculatedHash) {
        if (pp_ResponseCode === '000') {
            res.send('Transaction successful')
        } else {
            res.send('Transaction failed')
        }
    } else {
        res.status(400).send('Invalid response hash')
    }
}
