import nodemailer from 'nodemailer'
import { buildEmailTemplate, BRAND } from "../services/emailTemplate"

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.mail_user,
        pass: process.env.mail_pass
    }
})

// send verification email
export const sendVerificationEmail = async (
    email: string,
    fullname: string,
    role: 'farmer' | 'buyer',
    verificationLink: string
) => {
    const isFarmer = role === 'farmer'
    const subject = isFarmer 
        ? "Verify your Farm Connect farmer account" 
        : "Verify your Farm Connect buyer account"

    const welcomeMessage = isFarmer
        ? `Welcome to Farm Connect! Please verify your account to start listing produce, connect with buyers, and grow your reach.`
        : `Welcome to Farm Connect! Please verify your account to start exploring fresh produce directly from local farmers.`

    return await transporter.sendMail({
        from: `"FarmConnect" <${process.env.mail_user || process.env.MAIL_USER}>`,
        to: email,
        subject: subject,

        html: buildEmailTemplate(
            isFarmer ? "Verify Farmer Account" : "Verify Buyer Account",

            `
            <p>Hello ${fullname},</p>

            <p>
                ${welcomeMessage}
            </p>

            <div style="
                margin:30px 0;
                padding:25px;
                text-align:center;
                background:${BRAND.secondary};
                border-radius:12px;
                border:1px solid ${BRAND.border};
            ">

                <p style="
                    font-size:18px;
                    color:${BRAND.textDark};
                    margin-bottom:15px;
                ">
                    Click the button below to verify your email
                </p>

                <a href="${verificationLink}" style="
                    display:inline-block;
                    padding:14px 28px;
                    background:${BRAND.primary};
                    color:#fff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                ">
                    Verify Email
                </a>

            </div>

            <p>
                This link will expire in <strong>30 minutes</strong> for your security.
            </p>

            <p style="
                font-size:14px;
                color:#888;
                margin-top:30px;
            ">
                If you did not create this account,
                you can safely ignore this email.
            </p>
            `
        )
    })
}


// send reset password email
export const sendPasswordReset = async (email: string, fullname: string, resetLink: string) => {
    return await transporter.sendMail({
        from: `"FarmConnect" <${process.env.mail_user || process.env.MAIL_USER}>`,
        to: email,
        subject: "Reset Your Password",

        html: buildEmailTemplate(
            "Password Reset",

            `
            <p>Hello ${fullname},</p>

            <p>
                We received a request to reset your password for your
                <strong>FarmConnect</strong> account.
            </p>

            <div style="
                margin:30px 0;
                padding:25px;
                text-align:center;
                background:${BRAND.secondary};
                border-radius:12px;
                border:1px solid ${BRAND.border};
            ">

                <p style="
                    font-size:18px;
                    color:${BRAND.textDark};
                    margin-bottom:15px;
                ">
                    Click the button below to reset your password
                </p>

                <a href="${resetLink}" style="
                    display:inline-block;
                    padding:14px 28px;
                    background:${BRAND.primary};
                    color:#fff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                ">
                    Reset Password
                </a>

            </div>

            <p>
                This link will expire in <strong>10 minutes</strong> for your security.
            </p>

            <p style="
                font-size:14px;
                color:#888;
                margin-top:30px;
            ">
                If you did not request this, you can safely ignore this email.
            </p>
            `
        )
    })
}