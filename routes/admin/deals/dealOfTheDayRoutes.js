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
        
        validateSchema(dealOfTheDayValidationSchema),
        createDealOfTheDay
    )
    .get(protect, getAllDealsOfTheDay)

router
    .route('/:id')
    .get(getDealOfTheDayById)
    .put(protect,  updateDealOfTheDay)
    .delete(protect,  deleteDealOfTheDay)

export default router
