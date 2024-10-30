import express from 'express'
import {
    createDealOfTheDay,
    getAllDealsOfTheDay,
    getDealOfTheDayById,
    updateDealOfTheDay,
    deleteDealOfTheDay,
} from '../../../controllers/admin/deals/dealOfTheDayController.js'
import { validateSchema } from '../../../middleware/validationMiddleware.js'
import dealOfTheDayValidationSchema from '../../../validations/dealOfTheDayValidator.js'
import { protect } from '../../../middleware/authMiddleware.js'
import { restrictTo } from '../../../middleware/authMiddleware.js'

const router = express.Router()
router
    .route('/')
    .post(
        protect,
        restrictTo('promotion-management'),
        validateSchema(dealOfTheDayValidationSchema),
        createDealOfTheDay
    )
    .get(protect, getAllDealsOfTheDay)

router
    .route('/:id')
    .get(getDealOfTheDayById)
    .put(protect, restrictTo('promotion-management'), updateDealOfTheDay)
    .delete(protect, restrictTo('promotion-management'), deleteDealOfTheDay)

export default router
