import mongoose from 'mongoose'
import keys from './keys.js'

mongoose.set('strictQuery', false)

// UserDB connection
export const userDbConnection = mongoose.createConnection(keys.userDbURI)

// AdminDB connection
export const adminDbConnection = mongoose.createConnection(keys.adminDbURI)

// TransactionDB connection
export const transactionDbConnection = mongoose.createConnection(
    keys.transcationDbURI
)

// SellerDB connection
export const sellerDbConnection = mongoose.createConnection(keys.sellerDbURI)
