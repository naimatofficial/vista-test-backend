import express from 'express'
import {
    createCustomer,
    deleteCustomer,
    getCustomer,
    getCustomers,
    updateCustomer,
    updateCustomerStatus,
} from './../../controllers/users/customerController.js'
import {
    logout,
    loginCustomer,
    signupCustomer,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyCustomerOTPViaEmail,
} from '../../controllers/authController.js'
import {
    protect,
    restrictTo,
    selectModelByRole,
} from '../../middleware/authMiddleware.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import customerValidationSchema from './../../validations/customerValidator.js'
// import { loginLimiter } from '../../utils/helpers.js'

const router = express.Router()

router.post('/login', loginCustomer)
router.post(
    '/register',
    validateSchema(customerValidationSchema),
    signupCustomer
)

router.post('/otp/verify', verifyCustomerOTPViaEmail)
router.post('/logout', protect, logout)

router.put('/update-password', protect, selectModelByRole, updatePassword)
router.post('/forgot-password', forgotPassword)
router.put('/reset-password/:token', resetPassword)

router
    .route('/')
    .post(
        protect,
        restrictTo('user-management'),
        validateSchema(customerValidationSchema),
        createCustomer
    )
    .get(protect, restrictTo('user-management'), getCustomers)

router.put(
    '/status/:id',
    protect,
    restrictTo('user-management'),
    updateCustomerStatus
)

router
    .route('/:id')
    .get(getCustomer)
    .put(protect, updateCustomer)
    .delete(protect, restrictTo('user-management'), deleteCustomer)

export default router
