import express from 'express'
import {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    getOrderByCustomer,
} from '../../controllers/transactions/orderControllers.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import orderValidationSchema from '../../validations/admin/transactions/orderValidator.js'
import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

router
    .route('/')
    .post(protect, validateSchema(orderValidationSchema), createOrder)
    .get(protect, restrictTo('order-management'), getAllOrders)

router.get('/customer/:customerId', getOrderByCustomer)

router.route('/:id').get(protect, getOrderById).delete(protect, deleteOrder)

router
    .route('/status/:id')
    .put(protect, restrictTo('order-management'), updateOrderStatus)

export default router
