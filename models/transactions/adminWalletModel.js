import mongoose from "mongoose";
import { transactionDbConnection } from "../../config/dbConnections.js";

const adminWalletSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
    },
    userType: {
      type: String,
    },
    InhouseEarning: {
      type: String,
    },
    commissionEarned: {
      type: String,
    },
    deliveryChargeEarned: {
      type: String,
    },
    totalTaxCollected: {
      type: String,
    },
    pendingAmount: {
      type: String,
    },
  },
  { timestamps: true }
);

const Wallet = transactionDbConnection.model("AdminWallet", adminWalletSchema);

export default Wallet;
