
import { Request, Response, NextFunction } from 'express'
// Import the JSON Web Token (JWT) library for verifying tokens
import jwt, { JwtPayload } from 'jsonwebtoken'

// Import your database models (user)
import User, { IUser } from '../models/user'

// Extend Express Request to include custom fields
interface AuthRequest extends Request {
  user?: IUser
  token?: string
}

// Authentication middleware to protect routes
const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get the 'Authorization' header from the request
    const authHeader = req.header('Authorization')

    // If the header starts with "Bearer ", remove it and extract only the token.
    // Otherwise, check for an 'x-auth-token' header (some clients use that instead).
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.header('x-auth-token')

    // If there’s no token at all, deny access.
    if (!token) {
      return res.status(401).json({ status: 'error', msg: 'No token provided' })
    }

    const secret = process.env.jwt_secret

    if (!secret) {
      return res.status(500).json({ status: 'error', msg: 'JWT secret not configured' })
    }

    // Verify the token using your secret key from the .env file
    // This decodes the token and gives access to the payload (e.g., the user's ID)
    const decoded = jwt.verify(token, secret) as JwtPayload & { _id: string }

    // Find user in DB
    const user = await User.findById(decoded._id)

    if (!user) {
      return res.status(401).json({ status: 'error', msg: 'User not found' })
    }

    // Attach user to request
    req.token = token;
    req.user = user;

    next()
    }  catch (error: any) {
        console.error('Auth middleware error:', error)
    // If token is expired, handle it clearly
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ status: 'error', msg: 'Token expired' })

    // If token is invalid or malformed
    if (error.name === 'JsonWebTokenError')
      return res.status(401).json({ status: 'error', msg: 'Invalid token' })

    // If some unexpected server error occurs
    res.status(500).json({ status: 'error', msg: 'Server error during authentication' })
  }
}

// Export the middleware so you can use it in your routes
export default auth