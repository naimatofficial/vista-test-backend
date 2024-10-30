import axios from 'axios'
import generateSecureHash from './../../utils/generateSecureHash.js'
import keys from './../../config/keys.js'

// Card Transaction: Page Redirection
export const initiateCardPayment = (req, res) => {
    const params = {
        pp_Amount: req.body.amount * 100, // Multiply by 100 as per JazzCash requirement
        pp_MerchantID: keys.merchantId,
        pp_Password: keys.password,
        pp_TxnCurrency: 'PKR',
        pp_ReturnURL: keys.returnUrl,
        pp_TxnRefNo: `T${Date.now()}`,
        pp_TxnDateTime: new Date().toISOString(),
    }
    params.pp_SecureHash = generateSecureHash(params, keys.integritySalt)

    // Redirect user to JazzCash payment page
    const formUrl = `${keys.postUrl}?${new URLSearchParams(params).toString()}`
    res.redirect(formUrl)
}

// Wallet Transaction using API v2.0
export const initiateWalletPayment = async (req, res) => {
    const params = {
        pp_Amount: req.body.amount * 100,
        pp_MerchantID: keys.merchantId,
        pp_Password: keys.password,
        pp_TxnCurrency: 'PKR',
        pp_TxnRefNo: `W${Date.now()}`,
        pp_TxnDateTime: new Date().toISOString(),
    }
    params.pp_SecureHash = generateSecureHash(params, keys.integritySalt)

    try {
        const response = await axios.post(keys.walletApiUrl, params)
        if (response.data.pp_ResponseCode === '000') {
            res.json({
                success: true,
                message: 'Transaction successful',
                data: response.data,
            })
        } else {
            res.json({
                success: false,
                message: 'Transaction failed',
                data: response.data,
            })
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
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
