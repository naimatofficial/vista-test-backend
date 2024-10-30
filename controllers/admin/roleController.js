import Role from '../../models/admin/roleModel.js'

import {
    deleteOne,
    getAll,
    getOne,
    updateOne,
} from '../../factory/handleFactory.js'
import { getCacheKey } from '../../utils/helpers.js'
import redisClient from '../../config/redisConfig.js'
import AppError from '../../utils/appError.js'
import catchAsync from '../../utils/catchAsync.js'

const allowedModules = [
    'user-management',
    'employee-management',
    'system-settings',
    'product-management',
    'order-management',
    'reports-and-analysis',
    'promotion-management',
    'help-and-support',
]

export const createRole = catchAsync(async (req, res, next) => {
    const { name, modules } = req.body

    // Assuming `modules` is an array of requested modules coming from the client
    const unallowedModules = modules?.filter(
        (module) => !allowedModules.includes(module)
    )

    if (unallowedModules?.length > 0) {
        return next(
            new AppError(
                `The following modules are not allowed: ${unallowedModules.join(
                    ', '
                )}`,
                400
            )
        )
    }

    const doc = await Role.create({ name, modules })

    if (!doc) {
        return next(new AppError(`Role could not be created`, 400))
    }

    // delete all documents caches related to this model
    const cacheKey = getCacheKey('Role', '', req.query)
    await redisClient.del(cacheKey)

    res.status(201).json({
        status: 'success',
        doc,
    })
})

export const getRoles = getAll(Role)

export const getRoleById = getOne(Role)

export const updateRole = catchAsync(async (req, res, next) => {
    const { name, modules } = req.body
    const roleId = req.params.id

    const unallowedModules = modules?.filter(
        (module) => !allowedModules.includes(module)
    )

    if (unallowedModules?.length > 0) {
        return next(
            new AppError(
                `The following modules are not allowed: ${unallowedModules.join(
                    ', '
                )}`,
                400
            )
        )
    }

    // Perform the update operation
    const doc = await Role.findByIdAndUpdate(
        roleId,
        { name, modules },
        {
            new: true,
            runValidators: true,
        }
    )

    // Handle case where the document was not found
    if (!doc) {
        return next(new AppError(`No role found with that ID`, 404))
    }

    const cacheKeyOne = getCacheKey('Role', roleId)

    // delete pervious document data
    await redisClient.del(cacheKeyOne)
    // updated the cache with new data
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(doc))

    // Update cache
    const cacheKey = getCacheKey('Role', '', req.query)
    await redisClient.del(cacheKey)

    res.status(200).json({
        status: 'success',
        doc,
    })
})

export const deleteRole = deleteOne(Role)
