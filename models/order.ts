import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface for Order Document
export interface IOrder extends Document {
    buyerId: Types.ObjectId // reference to User (buyer)
    farmerId: Types.ObjectId // reference to User (farmer)
    items: [
        {
            productId: Types.ObjectId // reference to Product
            quantity: number
            purchasedPrice: number
        }
    ]
    totalPrice: number
    status: string // e.g. 'pending', 'confirmed', 'delivered', 'cancelled'
    deliveryAddress: string
    createdAt: Date
    updatedAt: Date
}

const orderSchema = new Schema<IOrder>({
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    farmerId: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [
        {
            productId: { type: Schema.Types.ObjectId, ref: 'Product' },
            quantity: Number,
            purchasedPrice: Number
        }
    ],
    totalPrice: Number,
    status: { 
        type: String,
        enum: [ 'pending', 'accepted', 'dispatched', 'delivered', 'cancelled' ],
        default: 'pending'
    },
    deliveryAddress: String
}, { timestamps: true, collection: 'orders' })

const Order = mongoose.model<IOrder>('Order', orderSchema)
export default Order