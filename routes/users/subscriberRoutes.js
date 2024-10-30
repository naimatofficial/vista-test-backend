import express from 'express'
import {
    getSubscribers,
    addSubscriber,
    deleteSubscriber,
} from '../../controllers/users/subscriberController.js'
import { validateSchema } from '../../middleware/validationMiddleware.js'
import subscriberValidationSchema from './../../validations/subscriberValidator.js'
import { protect, restrictTo } from './../../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, restrictTo('admin'), getSubscribers)
router
    .route('/')
    .post(validateSchema(subscriberValidationSchema), addSubscriber)

router.route('/:id').delete(protect, restrictTo('admin'), deleteSubscriber)

export default router
