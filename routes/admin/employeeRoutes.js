import express from 'express'

import {
    createEmployee,
    getEmployeeById,
    getEmployees,
    updateEmployee,
    deleteEmployee,
    updateEmployeeStatus,
    employeeLogin,
    updateEmployeePassword,
    forgotEmployeePassword,
    resetEmployeePassword,
} from '../../controllers/admin/employeeController.js'

import { logout } from '../../controllers/authController.js'

import { protect, restrictTo } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.post('/login', employeeLogin)
router.post('/logout', protect, logout)

router.put('/update-password', protect, updateEmployeePassword)
router.post('/forgot-password', forgotEmployeePassword)
router.put('/reset-password/:token', resetEmployeePassword)

router.route('/').post(protect, createEmployee).get(protect, getEmployees)

router
    .route('/:id')
    .get(protect, getEmployeeById)
    .put(protect, updateEmployee)
    .delete(protect, deleteEmployee)

router.put('/status/:id', protect, updateEmployeeStatus)

export default router
