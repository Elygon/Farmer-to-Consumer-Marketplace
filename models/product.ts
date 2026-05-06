import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface for Product Document
export interface IProduct extends Document {
    farmerId: Types.ObjectId // reference to User (farmer)
    name: string
    description: string
    pricePerUnit: number
    quantityAvailable: number
    unit: string
    location: string
    //category: string
    isAvaliable: boolean
    images: string[]
    createdAt: Date
    updatedAt: Date
}

// Product Schema
const productSchema = new Schema<IProduct>({
    farmerId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    description: String,
    pricePerUnit: Number,
    quantityAvailable: Number,
    unit: String, // e.g kg, basket, bag, etc.
    location: String,
    isAvaliable: { type: Boolean, default: true },
    images: [{
        id: String,
        url: String
    }]
}, { timestamps: true, collection: 'products' })

const Product = mongoose.model<IProduct>('Product', productSchema)
export default Product