const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(toEmail, fullname, code) {
    try {
        const response = await resend.emails.send({
            from: 'Fleurier <onboarding@resend.dev>',
            to: toEmail,
            subject: 'Verify your Fleurier account',
            html: `
            <div style="font-family: Arial, sans-serif;">
                <h1>🌸 Fleurier</h1>
                <h2>Hello ${fullname}</h2>
                <p>Your verification code is:</p>

                <div style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    background: #d0b9b6;
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    display: inline-block;
                ">
                    ${code}
                </div>

                <p>This code expires in 10 minutes.</p>
            </div>
            `
        });

        console.log('Email sent:', response);

    } catch (error) {
        console.error('Resend error:', error);
    }
}

module.exports = { sendVerificationEmail };