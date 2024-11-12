import dotenv from 'dotenv'

dotenv.config()

const keys = {
    port: process.env.PORT || 3000,

    // Redis db
    redisURL: process.env.REDIS_URL,
    redisPassword: process.env.REDIS_PASSWORD,
    // Databases
    adminDbURI: process.env.ADMIN_DB_URI,
    sellerDbURI: process.env.SELLER_DB_URI,
    userDbURI: process.env.USER_DB_URI,
    transcationDbURI: process.env.TRANSACTION_DB_URI,

    // S3 BUCKET KEYS
    AWSS3BucketName: process.env.AWS_S3_BUCKET_NAME,
    AWSAccessId: process.env.AWS_ACCESS_ID,
    AWSSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

    // JWT Keys
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTokenExpiresIn: process.env.JWT_ACCESS_TIME,
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TIME,

    redisUrl: process.env.REDIS_URL,

    // Email Configuration keys
    emailAddress: process.env.EMAIL_ADDRESS,
    emailPassKey: process.env.EMAIL_PASS_KEY,

    // Twilio Configuration keys
    twilioAccountSID: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

    otpSecretKey: process.env.OTP_SECRET_KEY,

    // JazzCash Configuration Keys

    jazzCashMerchantId: process.env.JAZZCASH_MERCHANT_ID,
    jazzCashPassword: process.env.JAZZCASH_PASSWORD,
    jazzCashIntegritySalt: process.env.JAZZCASH_INTEGRITY_SALT,
    jazzCashReturnUrl: process.env.JAZZCASH_RETURN_URL,
    jazzCashMobileWalletPostUrl: process.env.JAZZCASH_MOBILE_WALLET_POST_URL,
    jazzCashCardsPostUrl: process.env.JAZZCASH_CARDS_POST_URL,
}

export default keys
