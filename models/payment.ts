import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface for Payment Document
export interface IPayment extends Document {
    orderId: Types.ObjectId // reference to Order
    buyerId: Types.ObjectId // reference to User (buyer)
    amount: number
    paymentMethod: string // e.g. 'credit_card', 'mobile_money', 'bank_transfer'
    paymentStatus: string // e.g. 'pending', 'completed', 'failed'
    transactionId?: string // optional, for successful payments
    createdAt: Date
    updatedAt: Date
}

const paymentSchema = new Schema<IPayment>({
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    paymentMethod: {
        type: String,
        enum: [ 'credit_card', 'cash', 'bank_transfer' ]
    },
    paymentStatus: { 
        type: String,
        enum: [ 'pending', 'paid', 'failed' ],
        default: 'pending'
    },
    transactionId: String
}, { timestamps: true, collection: 'payments' })

const Payment = mongoose.model<IPayment>('Payment', paymentSchema)
export default Payment