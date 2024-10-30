import redisClient from '../config/redisConfig.js'
import AppError from '../utils/appError.js'

export function setRefreshToken(userId, refreshToken) {
    redisClient.SETEX(`refreshToken:${userId}`, 30 * 24 * 60 * 60, refreshToken)
}

export async function getRefreshToken(userId, next) {
    try {
        const refreshToken = await redisClient.GET(`refreshToken:${userId}`)
        return refreshToken || false
    } catch (err) {
        console.error('Error accessing Redis:', err)
        return next(new AppError('Error accessing Redis cache.', 500))
    }

    // return new Promise((resolve, reject) => {
    //     redisClient.GET(`refreshToken:${userId}`, (err, refreshToken) => {
    //         if (err) reject(err)
    //         resolve(refreshToken)
    //     })
    // })
}

export function removeRefreshToken(userId) {
    redisClient.DEL(`refreshToken:${userId}`)
}
