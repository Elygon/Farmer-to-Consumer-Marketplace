import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/token'
import User from '../models/user'
import cloudinary from '../services/cloudinary'
import multer from '../services/multer'
import { ProduceCategory } from '../constants/user'
import redis from '../config/redis'


// ======================== TYPES ========================
type UpdateProfileBody = {
    fullname?: string
    email?: string
    phoneNo?: string
    location?: {
        address?: string
        state?: string
        lga?: string
    }
    farmName?: string
    produceCategories?: ProduceCategory[]
}


// ======================== VIEW PROFILE ========================
router.post('/view', token, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id.toString()
        const cacheKey = `profile:${userId}`

        // Check cache first
        const cached = await redis.get(cacheKey)
        if (cached) return res.status(200).send(JSON.parse(cached))

        const user = await User.findById(userId).select('-password').lean()

        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' })
        }

        const response = { status: 'ok', msg: 'success', user }

        // Cache for 15 minutes
        await redis.set(cacheKey, JSON.stringify(response), 'EX', 900)

        return res.status(200).send(response)
    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'An error occurred while fetching user profile' })
    }
})


// ======================== UPDATE PROFILE ========================
router.post('/update', multer.single('profilePic'), token, async (req: Request, res: Response) => {
    try {
        const { 
            fullname, email, phoneNo, location, farmName, produceCategories
        } = req.body as UpdateProfileBody

        const userId = (req as any).user._id.toString()
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' })
        }

        // Find the uploaded file
        const file = req.file

        // Image handling
        if (file) {
            // delete old image if exists
            if (user.profilePic && user.profilePic.id) {
                try {
                    await cloudinary.uploader.destroy(user.profilePic.id)
                } catch (err) {
                    console.error('Cloudinary delete error:', err)
                }
            }
    
            // upload new image to cloudinary
            const upload = await cloudinary.uploader.upload(file.path, {
                folder: 'profile_photo'
            })

            user.profilePic = {
                id: upload.public_id,
                url: upload.secure_url
            }
        }

        // Update user fields
        if (fullname) user.fullname = fullname;
        if (email) user.email = email;
        if (phoneNo) user.phoneNo = phoneNo;
        if (farmName && user.role === 'farmer') user.farmName = farmName;
        if (produceCategories && user.role === 'farmer') user.produceCategories = produceCategories;

        // Update location
        if (location) {
            user.location = {
                address: location.address || (user.location && user.location.address),
                state: location.state || (user.location && user.location.state),
                lga: location.lga || (user.location && user.location.lga)
            }
        }

        await user.save()

        // Bust profile cache and auth user cache so middleware re-fetches fresh data
        await redis.del(`profile:${userId}`)
        await redis.del(`auth:user:${userId}`)

        return res.status(200).send({ status: 'ok', msg: 'success', user})
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token'})
        }
        return res.status(500).send({ status: 'error', msg: 'Error occurred'})

    }
})

export default router