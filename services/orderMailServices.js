import catchAsync from '../utils/catchAsync.js'
import sendEmail from './emailService.js'

export const sendOrderEmail = catchAsync(async (customer, orderId) => {
    const mailOptions = {
        email: customer.email,
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
                        background-color: #f9f9f9;
                        margin: 0;
                        padding: 0;
                    }
                    table {
                        width: 100%;
                        border-spacing: 0;
                        padding: 0;
                    }
                    .email-container {
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }
                    h1 {
                        color: #333;
                        font-size: 24px;
                        text-align: center;
                    }
                    p {
                        color: #333;
                        font-size: 16px;
                        line-height: 1.5;
                    }
                    .order-id {
                        font-weight: bold;
                        color: #007bff;
                    }
                    .btn {
                        display: inline-block;
                        background-color: #007bff;
                        color: #ffffff;
                        padding: 10px 20px;
                        font-size: 16px;
                        text-decoration: none;
                        border-radius: 4px;
                        text-align: center;
                    }
                    .footer {
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        margin-top: 20px;
                    }
                    .footer a {
                        color: #007bff;
                        text-decoration: none;
                    }
                    .footer a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center">
                            <table class="email-container" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1>Your Order Has Been Placed!</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <p>Hello ${customer.firstName},</p>
                                        <p>Thank you for your order! Your order ID is <span class="order-id">${orderId}</span>.</p>
                                        <p>We will keep you updated on its status soon.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <a href="https://vistamart.biz/profile/my-orders/${orderId}" class="btn">View Order Details</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="footer">
                                        <p>If you have any questions, feel free to <a href="mailto:support@vistmart.biz">contact us</a>.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
    }

    console.log(mailOptions)

    await sendEmail(mailOptions)
})
