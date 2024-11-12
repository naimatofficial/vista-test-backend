import express from 'express'

import {
    createEmployee,
    getEmployeeById,
    getEmployees,
    updateEmployee,
    deleteEmployee,
    updateEmployeeStatus,
    employeeLogin,
} from '../../controllers/admin/employeeController.js'

import { logout, updatePassword } from '../../controllers/authController.js'

import {
    protect,
    restrictTo,
    selectModelByRole,
} from '../../middleware/authMiddleware.js'

const router = express.Router()

router.post('/login', employeeLogin)
router.post('/logout', protect, logout)

router.put('/update-password', protect, selectModelByRole, updatePassword)

router
    .route('/')
    .post(protect,  createEmployee)
    .get(protect,  getEmployees)

router
    .route('/:id')
    .get(protect, getEmployeeById)
    .put(protect, updateEmployee)
    .delete(protect,  deleteEmployee)

router.put(
    '/status/:id',
    protect,
    
    updateEmployeeStatus
)

export default router
