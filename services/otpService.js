import nodemailer from 'nodemailer'
import speakeasy from 'speakeasy'
import twilio from 'twilio'
import crypto from 'crypto'

import catchAsync from '../utils/catchAsync.js'
import OTP from '../models/users/otpModel.js'
import keys from '../config/keys.js'
import AppError from '../utils/appError.js'

// keysure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: keys.emailAddress,
        pass: keys.emailPassKey,
    },
})

// keysure Twilio
// const client = twilio(keys.twilioAccountSID, keys.twilioAuthToken)
const client = []

// Generate OTP and its hash
export const generateOTP = () => {
    const token = speakeasy.totp({
        secret: keys.otpSecretKey,
        encoding: 'base32',
    })
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    return { token, hash }
}

// Send OTP via email
export const sendEmail = catchAsync(async (email, otp) => {
    const mailOptions = {
        from: keys.emailAddress,
        to: email,
        subject: 'Your Vistamart OTP Code',
        html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your OTP Code</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f9fafb;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background-color: #1D6713;
            color: #ffffff;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 20px;
            text-align: center;
          }
          .content p {
            font-size: 16px;
            margin: 0 0 10px;
            color: #4b5563;
          }
          .otp {
            display: inline-block;
            font-size: 24px;
            color: #25851B;
            letter-spacing: 4px;
            font-weight: bold;
            padding: 10px 20px;
            background-color: #f3f4f6;
            border-radius: 6px;
            margin-top: 10px;
          }
          .footer {
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
          }
          .footer a {
            color: #1D6713;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 Vista Mart OTP Verification</h1>
          </div>
          <div class="content">
            <p>Dear Customer,</p>
            <p>Your One-Time Password (OTP) for Vista Mart is:</p>
            <div class="otp">${otp}</div>
            <p>This code is valid for the next <strong>5 minutes</strong>. Please do not share it with anyone.</p>
            <p>Thank you for choosing Vista Mart!</p>
          </div>
          <div class="footer">
            <p>Best Regards,</p>
            <p>Vista Mart Team</p>
            <p>
              <a href="https://vistamart.com" target="_blank">Visit Vistamart</a> |
              <a href="mailto:support@vistamart.com">Contact Support</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    }
    return transporter.sendMail(mailOptions)
})

// Send OTP via SMS
export const sendSMS = catchAsync(async (phone, otp) => {
    return client.messages.create({
        body: `Dear Customer, your OTP code for Vistamart is: ${otp}. It is valid for 5 minutes.`,
        from: keys.twilioPhoneNumber,
        to: phone,
    })
})

// Save OTP to the database
export const saveOTP = catchAsync(async (email, phone, hash) => {
    const otpEntry = new OTP({ email, phone, hash, createdAt: Date.now() })
    const doc = await otpEntry.save()

    if (!doc) {
        throw new AppError(`OTP could not be created`, 400)
    }
})

// Verify OTP
export const validateOTP = async (token, otpHash) => {
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    return hash === otpHash // Returns true if the OTP hash matches, false otherwise
}
