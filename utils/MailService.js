const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure your API key is stored in .env

class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false, // use TLS
            auth: {
                user: process.env.BREVO_SMTP_USERNAME, // Your Brevo SMTP username
                pass: process.env.BREVO_SMTP_PASSWORD, // Your Brevo SMTP password
            },
        });
    }

    // Send Email Method
    async sendEmail(recipientEmail, subject, htmlContent, textContent) {
        const mailOptions = {
            from: process.env.SENDER_EMAIL_ADMIN, // Your email address
            to: recipientEmail, // Receiver's email
            subject: subject,
            text: textContent, // plain text body
            html: htmlContent, // HTML body
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Message sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Helper Method for Sending Sub-Admin Details
    async sendDetails(firstName, lastName, email, password, role) {
        const subject = `Your ${role} Account is Ready!`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 10px;">Dear ${firstName + ' ' + lastName},</p>
        
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 10px;">Your account has been successfully created. Please use the following details to log into the system:</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0;"><strong>Email:</strong> <span style="color: #2b88d8;">${email}</span></p>
                    <p style="font-size: 16px; line-height: 1.6; margin: 10px 0 0;"><strong>Password:</strong> <span style="color: #2b88d8;">${password}</span></p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 10px;">Welcome aboard!</p>
                
                <p style="font-size: 14px; color: #555; margin-top: 20px;">Best regards,</p>
                <p style="font-size: 14px; color: #555;">The Risers Consultancy Team</p>
            </div>
        `;

        const textContent = `Dear ${role}, Your account is ready. Email: ${email}, Password: ${password}`;

        return this.sendEmail(email, subject, htmlContent, textContent);
    }
}

module.exports = new MailService();
