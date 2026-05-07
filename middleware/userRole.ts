import { Request, Response, NextFunction } from 'express'
import { IUser } from '../models/user'

interface AuthRequest extends Request {
  user?: IUser
}

// Factory function for role-based access
const requireRole = (allowedRoles: Array<'farmer' | 'buyer'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', msg: 'Unauthorized' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        msg: 'You do not have permission to access this resource'
      })
    }

    next()
  }
}

export default requireRole