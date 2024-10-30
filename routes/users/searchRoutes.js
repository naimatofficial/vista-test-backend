import express from 'express'
import { advancedSearch } from '../../controllers/users/searchController.js'

const router = express.Router()

router.get('/', advancedSearch)

export default router
