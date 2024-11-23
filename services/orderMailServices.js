import keys from '../config/keys.js'
import catchAsync from '../utils/catchAsync.js'
import { emailTransporter } from '../utils/helpers.js'
import sendEmail from './emailService.js'

export const sendOrderEmail = catchAsync(async (email, customer, orderId) => {
    const mailOptions = {
        from: keys.emailAddress,
        to: email,
        subject: 'Your Order Has Been Placed',
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Order Confirmation</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f3f4f6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
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
                    }
                    .content p {
                        font-size: 16px;
                        margin: 0 0 10px;
                        color: #4b5563;
                    }
                    .order-id {
                        font-weight: bold;
                        color: #1D6713;
                    }
                    .cta {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: bold;
                        color: #ffffff !important;
                        background-color: #1D6713;
                        border-radius: 6px;
                        text-decoration: none;
                        text-align: center;
                    }
                    .cta:hover {
                        background-color: #14520D;
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
                    .footer a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Confirmation</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${customer.firstName},</p>
                        <p>Thank you for your order! Your order ID is <span class="order-id">${orderId}</span>.</p>
                        <p>We’ll keep you updated on the status of your order soon.</p>
                        <p>Thank you for choosing Vista Mart. We appreciate your business!</p>
                    </div>
                    <div class="footer">
                        <p>If you have any questions, feel free to <a href="mailto:support@vistamart.biz">contact us</a>.</p>
                        <p>Best Regards,</p>
                        <p>Vista Mart Team</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    }

    console.log({ mailOptions })

    emailTransporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending order email:', err)
        } else {
            console.log('Order email sent:', info.response)
        }
    })
})
