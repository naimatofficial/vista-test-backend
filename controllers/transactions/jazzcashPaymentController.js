const config = require('../config/jazzCashConfig')
const generateSecureHash = require('../utils/generateSecureHash')
const axios = require('axios')

// Card Transaction: Page Redirection
export const initiateCardPayment = (req, res) => {
    const params = {
        pp_Amount: req.body.amount * 100, // Multiply by 100 as per JazzCash requirement
        pp_MerchantID: config.merchantId,
        pp_Password: config.password,
        pp_TxnCurrency: 'PKR',
        pp_ReturnURL: config.returnUrl,
        pp_TxnRefNo: `T${Date.now()}`,
        pp_TxnDateTime: new Date().toISOString(),
    }
    params.pp_SecureHash = generateSecureHash(params, config.integritySalt)

    // Redirect user to JazzCash payment page
    const formUrl = `${config.postUrl}?${new URLSearchParams(
        params
    ).toString()}`
    res.redirect(formUrl)
}

// Wallet Transaction using API v2.0
export const initiateWalletPayment = async (req, res) => {
    const params = {
        pp_Amount: req.body.amount * 100,
        pp_MerchantID: config.merchantId,
        pp_Password: config.password,
        pp_TxnCurrency: 'PKR',
        pp_TxnRefNo: `W${Date.now()}`,
        pp_TxnDateTime: new Date().toISOString(),
    }
    params.pp_SecureHash = generateSecureHash(params, config.integritySalt)

    try {
        const response = await axios.post(config.walletApiUrl, params)
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
        config.integritySalt
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
