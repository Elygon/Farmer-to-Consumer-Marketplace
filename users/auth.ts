import express, { Request, Response } from 'express'
const router = express.Router()

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User, { IUser } from '../models/user'
import { ProduceCategory } from '../constants/user'

import token from '../middleware/token'
import { sendVerificationEmail, sendPasswordReset } from '../services/nodemailer'
import { BRAND } from '../services/emailTemplate'


// ======================== TYPES ========================
type RegisterBuyerBody = {
    fullname: string
    email: string
    phoneNo: string
    password: string
    location: {
        address: string
        state: string
        lga: string
    }
}

type RegisterFarmerBody = {
    fullname: string
    email: string
    phoneNo: string
    password: string
    location: {
        address: string
        state: string
        lga: string
    }
    farmName: string
    produceCategories: ProduceCategory[]
}

type LoginBody = {
    email: string
    password: string
}

type ChangePasswordBody = {
    old_password: string
    new_password: string
    confirm_new_password: string
}

type ForgotPasswordBody = {
  email: string
}

type ResetPasswordBody = {
    new_password: string
    confirm_password: string
    resetPasswordCode: string
}


// create buyer account
router.post('/register-buyer', async (req: Request, res: Response) => {
    const { fullname, email, phoneNo, password, location } = req.body as RegisterBuyerBody

    if (!fullname || !email || !phoneNo || !password || !location)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })

    // Start try block
    try {
        //Check if user already exists
        const check = await User.findOne({ email })
        if (check) {
            return res.status(409).send({ status: 'ok', msg: 'An account with this email already exists' })
        }

        //Hash password
        const hashedpassword = await bcrypt.hash(password, 10)

        //Create new user
        const user = new User()
        user.fullname = fullname
        user.email = email
        user.phoneNo = phoneNo
        user.password = hashedpassword
        user.location = location
        user.role = 'buyer'

        await user.save()

        
        // Generate verification link (expires in 30 minutes))
        const secret = process.env.jwt_secret
        if (!secret) {
            return res.status(500).send({ status: 'error', msg: 'JWT secret not configured '})
        }

        const verificationToken = jwt.sign(
            { _id: user._id }, secret,
            { expiresIn: "30m" }
        )

        // console.log("\n--- TESTING INFO ---");
        // console.log("Verification Token:", verificationToken);
        // console.log("--------------------\n");

        const verificationLink = `${process.env.BASE_URL}/auth/verify/${verificationToken}`
        
        // send email verification
        await sendVerificationEmail(user.email, user.fullname, user.role, verificationLink)

        return res.status(201).send({
            status: "ok", msg: "Account created. Please check your email to verify your account."
        })

    } catch (error: any) {
        if (error.name == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured.', error })
    }
})


// create farmer account
router.post('/register-farmer', async (req: Request, res: Response) => {
    const { 
        fullname, email, phoneNo, password, location, farmName, produceCategories
    } = req.body as RegisterFarmerBody

    if (!fullname || !email || !phoneNo || !password || !location || !farmName || !produceCategories)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })

    // Start try block
    try {
        //Check if user already exists
        const check = await User.findOne({ email })
        if (check) {
            return res.status(409).send({ status: 'ok', msg: 'An account with this email already exists' })
        }

        //Hash password
        const hashedpassword = await bcrypt.hash(password, 10)

        //Create new user
        const user = new User()
        user.fullname = fullname
        user.email = email
        user.phoneNo = phoneNo
        user.password = hashedpassword
        user.location = location
        user.farmName = farmName
        user.produceCategories = produceCategories
        user.role = 'farmer'

        await user.save()

        // Generate verification link (expires in 30 minutes))
        const secret = process.env.jwt_secret
        if (!secret) {
            return res.status(500).send({ status: 'error', msg: 'JWT secret not configured '})
        }

        const verificationToken = jwt.sign(
            { _id: user._id }, secret,
            { expiresIn: "30m" }
        )

        const verificationLink = `${process.env.BASE_URL}/auth/verify/${verificationToken}`
        
        // send email verification
        await sendVerificationEmail(user.email, user.fullname, user.role, verificationLink)
        
        return res.status(201).send({
            status: "ok", msg: "Account created. Please check your email to verify your account."
        })

    } catch (error: any) {
        if (error.name == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured.', error })
    }
})

// endpoint to verify account
router.get('/verify/:token', async (req, res) => {
    try {
        const decoded: any = jwt.verify(
            req.params.token,
            process.env.jwt_secret as string
        )

        const user = await User.findById(decoded._id)
        if (!user) {
            return res.status(404).send('User not found')
        }

        user.isVerified = true
        await user.save()

        const authToken = jwt.sign(
            { _id: user._id, role: user.role },
            process.env.jwt_secret as string,
            { expiresIn: '1d' }
        )

        // This will take effect when there's frontend url
        // return res.redirect(
        //     `${process.env.FRONTEND_URL}/auth/success?token=${authToken}`
        // )

        // Temporary response since there is no frontend yet
        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Account Verified</title>
            </head>

            <body style="
                margin:0;
                padding:0;
                font-family:Arial, sans-serif;
                background:#F4F5FF;
                display:flex;
                justify-content:center;
                align-items:center;
                height:100vh;
            ">

            <div style="
                width:100%;
                max-width:480px;
                background:#FFFFFF;
                border:1px solid #E8E8F0;
                border-radius:18px;
                padding:40px;
                text-align:center;
                box-shadow:0 10px 30px rgba(0,0,0,0.08);
            ">

                <!-- Success Icon -->
                <div style="
                    width:80px;
                    height:80px;
                    background:#1aa803;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    margin:0 auto 20px auto;
                ">
                    <span style="color:white;font-size:40px;">✓</span>
                </div>

                <!-- Title -->
                <h1 style="
                    color:#1aa803;
                    margin-bottom:10px;
                    font-size:26px;
                ">
                    Account Verified Successfully
                </h1>

                <!-- Message -->
                <p style="
                    color:#666666;
                    font-size:16px;
                    line-height:1.6;
                    margin-bottom:30px;
                ">
                    Your email has been verified successfully.<br/>
                    You can now log in to your account and start exploring Farm Connect.
                </p>

                <!-- Button -->
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="
                    display:inline-block;
                    padding:14px 28px;
                    background:#1aa803;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                    font-size:15px;
                ">
                    Go to Login
                </a>

                <!-- Footer note -->
                <p style="
                    margin-top:25px;
                    font-size:13px;
                    color:#888888;
                ">
                    Farm Connect
               </p>
 
            </div>

            </body>
            </html>
        `)

    } catch (error) {
        return res.status(400).send('Invalid or expired verification link')
    }
})

//endpoint to Login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginBody
    if (!email || !password)
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })

    try {
        // Fetch user using email
        let user: any = await User.findOne({ email })/*.select('+password')*/
        if (!user)
            return res.status(400).send({
                status: 'error', msg: 'No account found with the provided email'
            })

        // check if user's account has been verified
        if (!user.isVerified) {
            return res.status(403).send({ status: "error", msg: "Please verify your account first." })
        }

        // // check if blocked
        // if (user.is_blocked === true) {
        //     return res.status(400).send({ status: "error", msg: "account blocked" })
        // }

        // // check if banned
        // if (user.is_banned === true) {
        //     return res.status(400).send({ status: "error", msg: "account banned" })
        // }

        // // check if deleted
        // if (user.is_deleted === true) {
        //     return res.status(400).send({ status: "error", msg: "account deleted" })
        // }

        //compare password
        const correct_password = await bcrypt.compare(password, user.password)
        if (!correct_password)
            return res.status(400).send({ status: 'error', msg: 'Password is incorrect' })

        const secret = process.env.jwt_secret
        if (!secret) {
            return res.status(500).json({ status: 'error', msg: 'JWT secret not configured' })
        }

        // create token
        const token = jwt.sign({ _id: user._id, role: user.role }, secret, { expiresIn: '1d' })

        const safeUser = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNo: user.phoneNo,
            location: user.location,
            role: user.role
        }

        //update user document to online
        //user = await User.findOneAndUpdate({ _id: user._id }, { is_online: true }, { new: true }).lean()

        //send response
        res.status(200).send({ status: 'ok', msg: 'success', user: safeUser, token })

    } catch (error) {
        console.log(error)
        return res.status(500).send({ status: 'error', msg: 'An error occured' })
    }
})

//endpoint to Logout
router.post('/logout', token, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id

        // Set user offline
        //await User.findByIdAndUpdate(userId, { is_online: false })

        return res.status(200).send({ status: 'ok', msg: 'success' })

    } catch (error) {
        console.log(error)
        if (error == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured' })
    }
})

// endpoint to change password
router.post('/change_password', token, async (req: Request, res: Response) => {
    const { old_password, new_password, confirm_new_password } = req.body as ChangePasswordBody

    //check if fields are passed correctly
    if (!old_password || !new_password || !confirm_new_password) {
        return res.status(400).send({ status: 'error', msg: 'all fields must be filled' })
    }

    // get user document and change password
    try {
        const user: any = await User.findById((req as any).user._id).select("password")

        if (!user) {
            return res.status(400).send({ status: 'error', msg: 'User not found' })
        }

        //Compare old password
        const check = await bcrypt.compare(old_password, user.password)
        if (!check) {
            return res.status(400).send({ status: 'error', msg: 'old password is incorrect' })
        }

        //Prevent reusing old password
        const isSamePassword = await bcrypt.compare(new_password, user.password)
        if (isSamePassword) {
            return res.status(400).send({ status: 'error', msg: 'New password must be different from the old password' })
        }

        //Confirm new passwords match
        if (new_password !== confirm_new_password) {
            return res.status(400).send({ status: 'error', msg: 'Password mismatch' })
        }

        //Hash new password and update
        const updatePassword = await bcrypt.hash(confirm_new_password, 10)
        await User.findByIdAndUpdate((req as any).user._id, { password: updatePassword })

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError') {
            console.log(error)
            return res.status(401).send({ status: 'error', msg: 'Token Verification Failed', error: error.message })
        }
        return res.status(500).send({ status: 'error', msg: 'An error occured', error: error.message })
    }
})


// endpoint for a user to reset their password
router.post('/forgot_password', async (req: Request, res: Response) => {
    const { email/*, phone_no*/ } = req.body as ForgotPasswordBody

    if (!email/*&& !phone_no*/) {
        return res.status(400).send({ status: 'error', msg: 'Email is required' })
    }

    try {
        // Fetch user using email
        let user: any = await User.findOne({ email }).lean()

        if (!user) {
            return res.status(400).send({ status: 'error', msg: 'No account found with the provided email' });
        }

        const secret = process.env.jwt_secret!

        // Create reset token (expires in 10 min)
        const resetToken = jwt.sign({ _id: user._id }, secret, { expiresIn: '10m' });

        // Send email
        const resetLink = `${process.env.BASE_URL}/auth/reset_password/${resetToken}`
        await sendPasswordReset(user.email, user.fullname, resetLink)

        return res.status(200).send({ status: 'ok', msg: 'Password reset link sent. Please check your email or phone.' })

    } catch (error: any) {
        console.error(error)
        return res.status(500).send({ status: 'error', msg: 'Error occurred', error: error.message })
    }
})


// endpoint to reset password webpage
router.get("/reset_password/:resetPasswordCode", 
    async (req: Request<{ resetPasswordCode: string }>, res: Response) => {
        const { resetPasswordCode } = req.params
        try {
            const data: any = jwt.verify(resetPasswordCode, process.env.jwt_secret as  string)

            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reset Password</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>

                <body style="
                    margin:0;
                    font-family:Arial;
                    background:${BRAND.secondary};
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    height:100vh;
                ">

                <div style="
                    width:100%;
                    max-width:420px;
                    background:${BRAND.white};
                    padding:30px;
                    border-radius:14px;
                    border:1px solid ${BRAND.border};
                ">

                    <h2 style="color:${BRAND.primary}; text-align:center;">
                        Recover Account
                    </h2>

                    <p style="color:${BRAND.textLight}; text-align:center;">
                        Enter your new password
                    </p>

                    <form action="/auth/reset_password" method="post">

                    <!-- NEW PASSWORD -->
                    <div style="position:relative; margin:10px 0;">
                        <input type="password" id="new_password" name="new_password"
                            placeholder="New password"
                            required
                            style="
                                width:100%;
                                padding:12px;
                                border:1px solid ${BRAND.border};
                                border-radius:8px;
                                padding-right:42px;
                                box-sizing: border-box;
                            ">

                        <button type="button"
                            onclick="togglePassword('new_password', this)"
                            aria-label="Show password"
                            style="
                                position:absolute;
                                right:10px;
                                top:50%;
                                transform:translateY(-50%);
                                background:none;
                                border:none;
                                cursor:pointer;
                                color:${BRAND.primary};
                            ">

                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor"
                                fill="none" stroke-width="1.8"
                            >
                                <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>

                    <!-- CONFIRM PASSWORD -->
                    <div style="position:relative; margin:10px 0;">
                        <input type="password" id="confirm_password" name="confirm_password"
                            placeholder="Confirm password"
                            required
                            style="
                                width:100%;
                                padding:12px;
                                border:1px solid ${BRAND.border};
                                border-radius:8px;
                                padding-right:42px;
                                box-sizing: border-box;
                            ">

                        <button type="button"
                            onclick="togglePassword('confirm_password', this)"
                            aria-label="Show password"
                            style="
                                position:absolute;
                                right:10px;
                                top:50%;
                                transform:translateY(-50%);
                                background:none;
                                border:none;
                                cursor:pointer;
                                color:${BRAND.primary};
                            ">

                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="1.8">
                                <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>

                    <input type="hidden" name="resetPasswordCode" value="${resetPasswordCode}" />

                    <button type="submit" style="
                        width:100%;
                        padding:12px;
                        background:${BRAND.primary};
                        color:white;
                        border:none;
                        border-radius:8px;
                        font-weight:bold;
                        cursor:pointer;
                        margin-top:10px;
                    ">
                        Reset Password
                    </button>
                    </form>
                </div>

                <script>
                function togglePassword(inputId, button) {
                    const input = document.getElementById(inputId);
                    const svg = button.querySelector('svg');

                    if (input.type === 'password') {
                        input.type = 'text';
                        button.setAttribute('aria-label', 'Hide password');

                        svg.innerHTML =
                            '<path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"></path>' +
                            '<path d="M2 2l20 20" stroke="currentColor" stroke-width="1.8"></path>';
                        
                    } else {
                        input.type = 'password';
                        button.setAttribute('aria-label', 'Show password');

                        svg.innerHTML =
                            '<path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z"></path>' +
                            '<circle cx="12" cy="12" r="3"></circle>';
                    }
                }
                </script>

                </body>
                </html>
            `)
        } catch (e: any) {
            if (e.name === 'JsonWebTokenError') {
                // Handle general JWT errors
                console.error('JWT verification error:', e.message);
                return res.status(401).send(`</div>
                    <h1>Password Reset</h1>
                    <p>Token verification failed</p>
                </div>`);
            } else if (e.name === 'TokenExpiredError') {
                // Handle token expiration
                console.error('Token has expired at:', e.expiredAt);
                return res.status(401).send(`</div>
                    <h1>Password Reset</h1>
                    <p>Token expired</p>
                </div>`);
            }
            console.log(e);
            return res.status(200).send(`</div>
                <h1>Password Reset</h1>
                <p>An error occured!!! ${e.message}</p>
            </div>`)
        }
    }
)

// endpoint to reset password
router.post("/reset_password", async (req: Request, res: Response) => {
    const { new_password, confirm_password, resetPasswordCode } = req.body as ResetPasswordBody

    if (!new_password || !confirm_password || !resetPasswordCode) {
        return res
            .status(400)
            .json({ status: "error", msg: "All fields must be entered" })
    }

    // Check password equality
    if (new_password !== confirm_password) {
        return res
            .status(400)
            .json({ status: "error", msg: "Passwords do not match" });
    }

    // (Optional) check minimum length / complexity on the server side too
    if (new_password.length < 8) {
        return res
            .status(400)
            .json({ status: "error", msg: "Password must be at least 8 characters" });
    }

    try {
        const data: any = jwt.verify(resetPasswordCode, process.env.jwt_secret as string)
        const hashedPassword = await bcrypt.hash(new_password, 10)

        console.log("Resetting password for user ID:", data._id)


        // update the password field
        await User.updateOne(
            { _id: data._id },
            {
                $set: { password: hashedPassword },
            }
        );

        // return a response which is a web page
        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Password Reset Successful</title>
            </head>

            <body style="
                margin:0;
                padding:0;
                font-family:Arial, sans-serif;
                background:#F4F5FF;
                display:flex;
                justify-content:center;
                align-items:center;
                height:100vh;
            ">

            <div style="
                width:100%;
                max-width:480px;
                background:#FFFFFF;
                border:1px solid #E8E8F0;
                border-radius:18px;
                padding:40px;
                text-align:center;
                box-shadow:0 10px 30px rgba(0,0,0,0.08);
            ">

                <!-- Success Icon -->
                <div style="
                    width:80px;
                    height:80px;
                    background:#1aa803;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    margin:0 auto 20px auto;
                ">
                    <span style="color:white;font-size:40px;">✓</span>
                </div>

                <!-- Title -->
                <h1 style="
                    color:#1aa803;
                    margin-bottom:10px;
                    font-size:26px;
                ">
                    Password Reset Successful
                </h1>

                <!-- Message -->
                <p style="
                    color:#666666;
                    font-size:16px;
                    line-height:1.6;
                    margin-bottom:30px;
                ">
                    Your password has been successfully updated.<br/>
                    You can now log in to your account with your new password.
                </p>

                <!-- Button -->
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="
                    display:inline-block;
                    padding:14px 28px;
                    background:#1aa803;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:bold;
                    font-size:15px;
                ">
                    Go to Login
                </a>

                <!-- Footer note -->
                <p style="
                    margin-top:25px;
                    font-size:13px;
                    color:#888888;
                ">
                    Farm Connect
               </p>
 
            </div>

            </body>
            </html>
        `);
    } catch (e: any) {
        if (e.name === 'JsonWebTokenError') {
            // Handle general JWT errors
            console.error('JWT verification error:', e.message);
            return res.status(401).send(`</div>
          <h1>Password Reset</h1>
          <p>Token verification failed</p>
          </div>`);
        } else if (e.name === 'TokenExpiredError') {
            // Handle token expiration
            console.error('Token has expired at:', e.expiredAt);
            return res.status(401).send(`</div>
          <h1>Password Reset</h1>
          <p>Token expired</p>
          </div>`);
        }
        console.log("error", e);
        return res.status(200).send(`</div>
      <h1>Reset Password</h1>
      <p>An error occured!!! ${e.message}</p>
      </div>`)
    }
})


//endpoint to delete account
router.post('/delete', token, async (req: Request, res: Response) => {
    try {
        //Find the user and delete the account
        const deleted = await User.findByIdAndDelete((req as any).user._id)

        //Check if the user exists and was deleted
        if (!deleted)
            return res.status(400).send({ status: 'error', msg: 'No user Found' })

        return res.status(200).send({ status: 'ok', msg: 'success' })

    } catch (error) {
        console.log(error)

        if (error == "JsonWebTokenError")
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })

        return res.status(500).send({ status: 'error', msg: 'An error occured' })
    }

})

export default router