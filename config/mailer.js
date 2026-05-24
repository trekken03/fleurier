const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendVerificationEmail(toEmail, fullname, code) {
    const mailOptions = {
        from: `"Fleurier 🌸" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Verify your Fleurier account',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #fbfaf9; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #d0b9b6; font-size: 2rem; margin: 0;">🌸 Fleurier</h1>
            </div>
            <h2 style="color: #3a2a2a; font-size: 1.3rem;">Hi, ${fullname}!</h2>
            <p style="color: #666; line-height: 1.6;">
                Thank you for registering with Fleurier! Please use the verification code below to confirm your email address.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background-color: #d0b9b6; color: #fff; font-size: 2.5rem; font-weight: bold; letter-spacing: 12px; padding: 16px 32px; border-radius: 12px;">
                    ${code}
                </div>
            </div>
            <p style="color: #999; font-size: 0.85rem; text-align: center;">
                This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
            </p>
            <hr style="border: none; border-top: 1px solid #f0ebe9; margin: 24px 0;">
            <p style="color: #bbb; font-size: 0.8rem; text-align: center;">
                If you didn't create a Fleurier account, you can safely ignore this email.
            </p>
        </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail };