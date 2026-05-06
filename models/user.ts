import mongoose, { Schema, Document } from 'mongoose'

interface IProfilePic {
  id: string
  url: string
}

// Interface for User Document
export interface IUser extends Document {
    fullname?: string
    email?: string
    phoneNo?: string
    password?: string
    role: 'farmer' | 'buyer'
    location: string
    profilePic?: IProfilePic
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
    location: String,
    profilePic: {
        id: String,
        url: String
    }
}, { timestamps: true, collection: 'users' })

const User = mongoose.model<IUser>('User', userSchema)
export default User