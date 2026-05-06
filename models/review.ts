import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface for Review Document
export interface IReview extends Document {
    productId: Types.ObjectId // reference to Product
    reviewerId: Types.ObjectId // reference to User (reviewer)
    revieweeId: Types.ObjectId // reference to User (reviewee)
    rating: number // e.g. 1 to 5
    comment?: string
    createdAt: Date
    updatedAt: Date
}

const reviewSchema = new Schema<IReview>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    revieweeId: { type: Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 200 }
}, { timestamps: true, collection: 'reviews' })

const Review = mongoose.model<IReview>('Review', reviewSchema)
export default Review