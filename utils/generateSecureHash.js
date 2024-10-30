import crypto from 'crypto'

const generateSecureHash = (params, integritySalt) => {
    const sortedParams = Object.keys(params)
        .sort()
        .map((key) => params[key])
        .join('&')
    const stringToHash = `${integritySalt}&${sortedParams}`
    return crypto
        .createHmac('sha256', integritySalt)
        .update(stringToHash)
        .digest('hex')
        .toUpperCase()
}

export default generateSecureHash
