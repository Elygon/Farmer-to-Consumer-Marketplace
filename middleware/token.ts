
import { Request, Response, NextFunction } from 'express'
// Import the JSON Web Token (JWT) library for verifying tokens
import jwt, { JwtPayload } from 'jsonwebtoken'

// Import your database models (user)
import User, { IUser } from '../models/user'
import redis from '../config/redis'

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

    // If there's no token at all, deny access.
    if (!token) {
      return res.status(401).json({ status: 'error', msg: 'No token provided' })
    }

    const secret = process.env.jwt_secret

    if (!secret) {
      return res.status(500).json({ status: 'error', msg: 'JWT secret not configured' })
    }

    // Check if token has been blacklisted (i.e. user logged out)
    const isBlacklisted = await redis.get(`blacklist:token:${token}`)
    if (isBlacklisted) {
      return res.status(401).json({ status: 'error', msg: 'Token has been invalidated. Please log in again.' })
    }

    // Verify the token using your secret key from the .env file
    // This decodes the token and gives access to the payload (e.g., the user's ID)
    const decoded = jwt.verify(token, secret) as JwtPayload & { _id: string }

    // Check Redis cache for the user before hitting the DB
    const cacheKey = `auth:user:${decoded._id}`
    const cachedUser = await redis.get(cacheKey)

    if (cachedUser) {
      req.user = JSON.parse(cachedUser)
      req.token = token
      return next()
    }

    // Fall back to DB if not cached
    const user = await User.findById(decoded._id)

    if (!user) {
      return res.status(401).json({ status: 'error', msg: 'User not found' })
    }

    // Cache user for 15 minutes
    await redis.set(cacheKey, JSON.stringify(user), 'EX', 900)

    // Attach user to request
    req.token = token;
    req.user = user;

    next()
  } catch (error: any) {
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
