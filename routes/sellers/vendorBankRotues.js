import express from 'express'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import { protect, restrictTo } from '../../middleware/authMiddleware.js'

import vendorBankValidationSchema from '../../validations/admin/sellers/vendorBankValidator.js'
import {
    createVendorBank,
    deleteVendorBank,
    getAllVendorBanks,
    getVendorBankById,
    updateVendorBank,
} from '../../controllers/sellers/vendorBankController.js'

const router = express.Router()

router
    .route('/')
    .post(protect, validateSchema(vendorBankValidationSchema), createVendorBank)
    .get(protect, restrictTo('user-management'), getAllVendorBanks)

router
    .route('/:id')
    .get(protect, getVendorBankById)
    .put(protect, updateVendorBank)
    .delete(protect, restrictTo('user-management'), deleteVendorBank)

export default router
