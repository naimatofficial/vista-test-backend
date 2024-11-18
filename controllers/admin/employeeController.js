import Employee from '../../models/admin/employeeModel.js'
import AppError from '../../utils/appError.js'
import catchAsync from '../../utils/catchAsync.js'
import { createSendToken } from '../authController.js'
import {
    createOne,
    deleteOne,
    getAll,
    getOne,
    updateOne,
    updateStatus,
} from './../../factory/handleFactory.js'
import { deleteKeysByPattern } from '../../services/redisService.js'

export const employeeLogin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    // 1) Check if email and password exists
    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400))
    }

    // 2) Check the user exists && password is correct
    const user = await Employee.findOne({ email }).select('+password')

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401))
    }

    // 3) If everything is Ok, then send the response to client
    createSendToken(user, 200, res)
})

export const createEmployee = createOne(Employee)
export const getEmployees = getAll(Employee)
export const getEmployeeById = getOne(Employee)
export const deleteEmployee = deleteOne(Employee)
export const updateEmployee = updateOne(Employee)
export const updateEmployeeStatus = updateStatus(Employee)

export const updateEmployeePassword = catchAsync(async (req, res, next) => {
    const user = await Employee.findById(req.user._id).select('+password')

    // 2) Check the Posted current password is correct
    const correct = await user.correctPassword(
        req.body.passwordCurrent,
        user.password
    )

    if (!correct) {
        return next(new AppError('Your current password is wrong.', 401))
    }

    // 3) If so, update the password
    user.password = req.body.passwordNew
    user.passwordChangedAt = Date.now()

    await user.save()

    await deleteKeysByPattern('Employee')

    // 4) send JWT
    createSendToken(user, 200, res)
})
