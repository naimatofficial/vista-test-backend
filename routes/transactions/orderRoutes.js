import express from 'express'
import {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    getOrderByCustomer,
    getOrderStatus,
} from '../../controllers/transactions/orderControllers.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import orderValidationSchema from '../../validations/admin/transactions/orderValidator.js'
import { protect } from '../../middleware/authMiddleware.js'
import { restrictTo } from '../../middleware/authMiddleware.js'
import { updateOrderTrackingId } from '../../../vistamart-bazaaar-backend/controllers/transactions/orderControllers.js'

const router = express.Router()

router.route('/').post(protect, createOrder).get(protect, getAllOrders)

router.get('/customer/:customerId', getOrderByCustomer)

router.route('/:id').get(protect, getOrderById).delete(protect, deleteOrder)

router.get('/track-order/:orderId', getOrderStatus)

router.route('/status/:id').put(protect, updateOrderStatus)

export default router
