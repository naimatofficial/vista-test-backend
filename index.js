// import connectDB from './config/dbConnections.js'
import cron from 'node-cron'

// Import your featured deal model

import app from './app.js'
import FeaturedDeal from './models/admin/deals/featuredDealModel.js'
import generateSecureHash from './utils/generateSecureHash.js'
import keys from './config/keys.js'
// connectDB()

const port = keys.port || 3000

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

const params = {
    pp_Amount: '200',
    pp_BillReference: 'billRef3781',
    pp_CNIC: '345678',
    pp_Description: 'Test case description',
    pp_Language: 'EN',
    pp_MerchantID: 'MC32084',
    pp_MobileNumber: '03123456789',
    pp_Password: 'yy41w5f10e',
    pp_SecureHash:
        '39ECAACFC30F9AFA1763B7E61EA33AC75977FB2E849A5EE1EDC4016791F3438F',
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: '20220124224204',
    pp_TxnExpiryDateTime: '20220125224204',
    pp_TxnRefNo: 'TR4260001638077',
    ppmpf_1: '',
    ppmpf_2: '',
    ppmpf_3: '',
    ppmpf_4: '',
    ppmpf_5: '',
}

const hash = generateSecureHash(params, '9208s6wx05')

console.log(hash)
// 39ECAACFC30F9AFA1763B7E61EA33AC75977FB2E849A5EE1EDC4016791F3438F

app.listen(port, () => {
    console.log(`
  🚀 Server is up and running!
  🌐 URL: http://localhost:${port}
  🛠️  Environment: ${process.env.NODE_ENV || 'development'}
  📅  Started at: ${new Date().toLocaleString()}
  `)
})
