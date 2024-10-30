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

router.route('/').post(protect, createRole).get(protect, getRoles)

router
    .route('/:id')
    .get(protect, restrictTo('admin'), getRoleById)
    .put(protect, updateRole)
    .delete(protect, deleteRole)

export default router
