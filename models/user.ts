import mongoose, { Schema, Document } from 'mongoose'
import { PRODUCE_CATEGORIES, ProduceCategory } from '../constants/user'

// Interface for Profile Photo Document
interface IProfilePic {
  id: string
  url: string
}

// Interface for Location Document
interface ILocation {
    address: string
    state: string
    lga: string
}

// Interface for User Document
export interface IUser extends Document {
    fullname: string
    email: string
    phoneNo: string
    password: string
    role: 'farmer' | 'buyer'
    location: ILocation
    farmName?: string
    produceCategories?: ProduceCategory[]
    profilePic?: IProfilePic
    isVerified: boolean
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// User Schema
const userSchema: Schema<IUser> = new Schema({
    fullname: String,
    email: String,
    phoneNo: String,
    password: String,
    role: { type: String, enum: ['farmer', 'buyer'] },
    location: { address: String, state: String, lga: String },
    farmName: String,
    produceCategories: [{
        type: String,
        enum: PRODUCE_CATEGORIES
    }],
    profilePic: {
        id: String,
        url: String
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true, collection: 'users' })

const User = mongoose.model<IUser>('User', userSchema)
export default User