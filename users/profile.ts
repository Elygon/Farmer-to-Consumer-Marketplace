import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/token'
import User from '../models/user'
import cloudinary from '../services/cloudinary'
import multer from '../services/multer'
import { ProduceCategory } from '../constants/user'


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

