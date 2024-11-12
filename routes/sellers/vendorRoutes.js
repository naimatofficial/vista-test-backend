import express from 'express'
import {
    createVendor,
    registerVendor,
    updateVendorStatus,
    getAllVendors,
    getVendorById,
    deleteVendor,
    updateVendor,
    getVendorBySlug,
} from '../../controllers/sellers/vendorController.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import vendorValidationSchema from '../../validations/admin/sellers/vendorValidator.js'

import {
    protect,
    restrictTo,
    selectModelByRole,
} from '../../middleware/authMiddleware.js'
import {
    loginVendor,
    logout,
    updatePassword,
} from '../../controllers/authController.js'

const router = express.Router()

router
    .route('/signup')
    .post(validateSchema(vendorValidationSchema), registerVendor)

router.post('/login', loginVendor)
router.post('/logout', protect, logout)

router.route('/').post(protect, createVendor).get(getAllVendors)

router
    .route('/:id')
    .get(getVendorById)
    .delete(protect, deleteVendor)
    .put(protect, updateVendor)

router.put('/update-password', protect, selectModelByRole, updatePassword)

router.put(
    '/status/:id',
    protect,

    updateVendorStatus
)

router.get('/slug/:slug', getVendorBySlug)

export default router
