import express from 'express'

import {
    createRole,
    deleteRole,
    getRoleById,
    getRoles,
    updateRole,
} from '../../controllers/admin/roleController.js'
import { protect, restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

// router.use()

router
    .route('/')
    .post(createRole)
    .get(protect, restrictTo('employee-management'), getRoles)

router
    .route('/:id')
    .get(protect, getRoleById)
    .put(protect, updateRole)
    .delete(protect, deleteRole)

export default router
