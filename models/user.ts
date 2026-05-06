import mongoose, { Schema, Document, Model } from 'mongoose'

//Interface for User Document
export interface IUser extends Document {
    fullname?: string
    email?: string
    phoneNo?: string
    password?: string
    role: string
    location: string
    profilePic?: string
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
}, { timestamps: true, collections: 'users'})

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema)
export default User