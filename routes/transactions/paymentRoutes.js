import express from 'express'
import {
    handleJazzCashResponse,
    initiateCardPayment,
    initiateWalletPayment,
} from '../../controllers/transactions/jazzcashPaymentController.js'

const router = express.Router()

router.post('/initiate/card', initiateCardPayment)
router.post('/initiate/wallet', initiateWalletPayment)
router.post('/jazzcash/return', handleJazzCashResponse)

export default router
