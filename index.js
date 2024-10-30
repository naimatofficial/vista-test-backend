import config from './config/keys.js'
// import connectDB from './config/dbConnections.js'
import cron from 'node-cron'

// Import your featured deal model

import app from './app.js'
import FeaturedDeal from './models/admin/deals/featuredDealModel.js'
import generateSecureHash from './utils/generateSecureHash.js'

// connectDB()

const port = config.port || 3000

// Schedule the task here
cron.schedule('0 0 * * *', async () => {
    try {
        const currentDate = new Date()
        await FeaturedDeal.updateMany(
            { endDate: { $lt: currentDate } },
            { $set: { status: 'expired' } }
        )
        console.log('Expired Feartured deals updated successfully')
    } catch (error) {
        console.error('Error updating expired deals:', error)
    }
})

// Example usage
const params = {
    pp_Amount: '25000',
    pp_MerchantID: 'MC25041',
    pp_MerchantMPIN: '1234',
    pp_Password: 'sz1v4agvyf',
    pp_TxnCurrency: 'PKR',
    pp_TxnRefNo: 'T20220518150213',
}

const hashKey = '3vv9wu3a123' // Integrity Salt/Hash Key
const secureHash = generateSecureHash(params, hashKey)
console.log('Resultant Hash:', secureHash)

app.listen(port, () => {
    console.log(`
  🚀 Server is up and running!
  🌐 URL: http://localhost:${port}
  🛠️  Environment: ${process.env.NODE_ENV || 'development'}
  📅  Started at: ${new Date().toLocaleString()}
  `)
})
