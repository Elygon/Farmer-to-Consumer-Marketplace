import mongoose, { Schema, Document, Types } from 'mongoose'
import { PRODUCE_CATEGORIES, ProduceCategory } from '../constants/user'
import { ILocation } from './user'

// Interface for Product Document
export interface IProduct extends Document {
    farmerId: Types.ObjectId // reference to User (farmer)
    name: string
    description: string
    pricePerUnit: number
    quantityAvailable: number
    unit: string
    location: ILocation
    category: ProduceCategory
    isAvailable: boolean
    images: string[]
    createdAt: Date
    updatedAt: Date
}

// Product Schema
const productSchema = new Schema<IProduct>({
    farmerId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    description: String,
    category: { type: String, enum: PRODUCE_CATEGORIES },
    pricePerUnit: Number,
    quantityAvailable: Number,
    unit: {
        type: String,
        enum: ['kg', 'g', 'ton', 'bag', 'basket', 'crate', 'piece', 'dozen','litre']
    },
    location: {
        address: String,
        state: String,
        lga: String
    },
    isAvailable: { type: Boolean, default: true },
    images: [{
        id: String,
        url: String
    }]
}, { timestamps: true, collection: 'products' })

const Product = mongoose.model<IProduct>('Product', productSchema)
export default Product