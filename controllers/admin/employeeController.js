import Employee from '../../models/admin/employeeModel.js'
import AppError from '../../utils/appError.js'
import catchAsync from '../../utils/catchAsync.js'
import { createSendToken } from '../authController.js'

import redisClient from '../../config/redisConfig.js'
import { getCacheKey } from '../../utils/helpers.js'

import {
    createOne,
    deleteOne,
    getAll,
    getOne,
    updateOne,
    updateStatus,
} from './../../factory/handleFactory.js'

export const employeeLogin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    console.log(req.body)

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

export const updateRole = catchAsync(async (req, res, next) => {
    const { employeeId, role } = req.body
    const doc = await Employee.findByIdAndUpdate(
        employeeId,
        { role },
        {
            new: true,
            runValidators: true,
        }
    )

    if (!doc) {
        return next(new AppError(`No Employee found with that email`, 404))
    }

    const cacheKeyOne = getCacheKey('Employee', req.params.id)

    // delete pervious document data
    await redisClient.del(cacheKeyOne)
    // updated the cache with new data
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(doc))

    // Update cache
    const cacheKey = getCacheKey('Employee', '', req.query)
    await redisClient.del(cacheKey)

    res.status(200).json({
        status: 'success',
        doc,
    })
})
