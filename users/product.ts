import express, { Request, Response } from 'express'
const router = express.Router()

import Product from '../models/product'
import User from '../models/user'
import token from '../middleware/token'
import { PRODUCE_CATEGORIES, ProduceCategory } from '../constants/user'
import { ILocation } from '../models/user'
import cloudinary from '../services/cloudinary'
import multer from '../services/multer'


// ======================== TYPES ========================
type ViewAllProductsBody = {
    page?: number,
    limit?: number
}

type ProductBody = {
    productId: string
}

type SearchBody = {
    keyword: string
}

type FilterBody = {
    category?: ProduceCategory
    state?: string
    lga?: string
    minPrice?: number
    maxPrice?: number
    unit?: string
    isAvailable?: boolean
    sortBy?: 'price' | 'latest'
    order?: 'asc' | 'desc'
}

type FarmerProductsBody = {
    farmerId: string
}

type CreateProductBody = {
    name: string
    description: string
    category: ProduceCategory
    pricePerUnit: number
    quantityAvailable: number
    unit: string
    location: ILocation
}

type MyProductsBody = {
    page?: number,
    limit?: number
}

type UpdateProductBody = {
    productId: string
    name?: string
    description?: string
    category?: ProduceCategory
    pricePerUnit?: number
    quantityAvailable?: number
    unit?: string
    location?: ILocation
    isAvailable?: boolean
    images?: { id: string, url: string }[]
}

// ======================== VIEW ALL PRODUCTS ========================
router.post('/all', async(req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.body as ViewAllProductsBody
        const skip = (page - 1) * limit

        const totalProducts = await Product.countDocuments({ isAvailable: true })
        const products = await Product.find({ isAvailable: true })
        .populate('farmerId', 'fullname farmName phoneNo location profilePic').sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean()

        return res.status(200).send({ 
            status: 'ok', msg: 'success', totalProducts, totalPages: Math.ceil(totalProducts / limit), products
        })

    } catch (error: any) {
        console.log(error)
        return res.status(500).send({ status: 'error', msg: 'An error occurred while fetching products' })
    }
})


// ======================== VIEW A PRODUCT ========================
router.post('/view', token, async (req: Request, res: Response) => {
    const { productId } = req.body as ProductBody

    if  (!productId) {
        return res.status(400).send({ status: 'error', msg: 'Product ID is required' })
    }

    try {
        const product = await Product.findOne({ _id: productId, isAvailable: true })
        .populate('farmerId', 'fullname farmName phoneNo location profilePic').lean()

        if (!product) {
            return res.status(404).send({ status: 'error', msg: 'Product not found'})
        }

        return res.status(200).send({ status: 'ok', msg: 'success', product})
    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token'})
        }
        return res.status(500).send({ status: 'error', msg: 'An error occurred while fetching the product'})
    }
})


// ======================== SEARCH PRODUCT ========================
router.post('/search', async (req: Request, res: Response) => {
    const { keyword } = req.body as SearchBody
    if (!keyword || keyword.trim() === '') {
        return res.status(400).send({ status: 'error', msg: 'Search keyword is required'})
    }

    try {
        const search = keyword.trim()
        const category = search.toLowerCase()

        const products = await Product.find({
            isAvailable: true,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: category },
                { 'location.state': { $regex: search, $options: 'i' } },
                { 'location.lga': { $regex: search, $options: 'i' } }
            ]
        } as any).populate('farmerId', 'fullname farmName profilePic').sort({ createdAt: -1 }).lean()

        return res.status(200).send({ status: 'ok', msg: 'success', count: products.length, products })
    } catch (error: any) {
        console.log(error)
        
        return res.status(500).send({ status: 'error', msg: 'An error occurred while searching for products'})
    }
})


// ======================== FILTER PRODUCTS ========================
router.post('/filter', async (req: Request, res: Response) => {
    const { category, state, lga, minPrice, maxPrice, unit, isAvailable, sortBy, order } = req.body as FilterBody
    
    try {
        const query: any = {}

        // Only available products by default
        query.isAvailable = isAvailable ?? true

        // Category
        if (category) {
            query.category = category
        }

        // Unit
        if (unit) {
            query.unit = {
                $regex: unit,
                $options: 'i'
            }
        }

        // State
        if (state) {
            query['location.state'] = {
                $regex: state,
                $options: 'i'
            }
        }

        // Local Government
        if (lga) {
            query['location.lga'] = {
                $regex: lga,
                $options: 'i'
            }
        }

        // Price Range
        if (minPrice !== undefined && maxPrice !== undefined) {
            query.pricePerUnit = {}

            if (minPrice !== undefined) {
                query.pricePerUnit.$gte = Number(minPrice)
            }

            if ( maxPrice !== undefined) {
                query.pricePerUnit.$lte = Number(maxPrice)
            }
        }

        // Determine ascending/descending order
        let sort: any = { createdAt: -1 }
        if (sortBy === 'price') {
            sort = {
                pricePerUnit: order === 'asc' ? 1 : -1
            }
        }

        const products = await Product.find(query)
        .populate('farmerId', 'fullname farmName phoneNo profilePic location').sort(sort).lean()

        return res.status(200).send({ status: 'ok', msg: 'success', count: products.length, products})
    } catch (error: any) {
        console.log(error)

        return res.status(500).send({ status: 'error', msg: 'An error occurred while filtering products'})
    }
})


// ======================== FARMER PRODUCTS ========================
router.post('/farmer', token, async (req: Request, res: Response) => {
    const { farmerId } = req.body as FarmerProductsBody
    if (!farmerId) {
        return res.status(400).send({ status: 'error', msg: 'Farmer ID is required' })
    }

    try {
        // Ensure the farmer exists
        const farmer = await User.findOne({ _id: farmerId, role: 'farmer', isActive: true, isVerified: true })
        .select('fullname farmName profilePic location produceCategories').lean()

        if (!farmer) {
            return res.status(404).send({ status: 'error', msg: 'Farmer not found' })
        }

        // Fetch the farmer's available products
        const products = await Product.find({ farmerId, isAvailable: true}).sort({ createdAt: -1}).lean()

        return res.status(200).send({ status: 'ok', msg: 'success', farmer, count: products.length, products })
    } catch (error: any) {
        console.log(error)

        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid farmer ID'})
        }
        return res.status(500).send({ status: 'error', msg: 'An error occurred while fetching farmer products' })
    }
})


// =================================================================
// ======================== FARMER ENDPOINTS =======================
// =================================================================

// Add new product to farmer's products
router.post('/add', token, multer.array('images', 5), async(req: Request, res: Response) => {
    const {
        name, description, category, pricePerUnit, quantityAvailable, unit, location
    } = req.body as CreateProductBody

    if (!name || !description || !category || !pricePerUnit === undefined || !quantityAvailable === undefined
        || !unit || !location ) {
        return res.status(400).send({ status: 'error', msg: 'All fields are required' })
    }

    try {
        const farmer: any = await User.findById((req as any).user._id)
        if (!farmer) {
            return res.status(404).send({ status: 'error', msg: 'Farmer not found' })
        }

        if (farmer.role !== 'farmer') {
            return res.status(403).send({ status: 'error', msg: 'Only farmers can add products' })
        }

        if (!farmer.isVerified) {
            return res.status(403).send({ status: 'error', msg: 'Please verify your account first' })
        }

        // Ensure farmer is adding products only from registered produce categories
        if (!farmer.produceCategories.includes(category)) {
            return res.status(400).send({ 
                status: 'error', msg: 'You cannot add a product outside your registered produce categories' 
            })
        }

        const images: { id: string, url: string }[] = []

        const files = (req as any).files
        if (files && files.length > 0) {
            for (const file of files) {
                const upload = await cloudinary.uploader.upload(file.path, {
                    folder: 'product_images'
                })

                images.push({
                    id: upload.public_id,
                    url: upload.secure_url
                })
            }
        }

        const product = new Product()

        product.farmerId = farmer._id
        product.name = name
        product.description = description
        product.category = category
        product.pricePerUnit = pricePerUnit
        product.quantityAvailable = quantityAvailable
        product.unit = unit
        product.location = location
        product.images = images

        await product.save()
 
        return res.status(201).send({ status: 'ok', msg: 'success', product})
    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid farmer ID'})
        }
        return res.status(500).send({ status: 'error', msg: 'An error occurred while adding product' })
    }
})

// My Products (Farmer)
router.post('/my-products',token, async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.body as MyProductsBody
    try {
        const farmer: any = await User.findById((req as any).user._id).lean()
        if (!farmer) {
            return res.status(404).send({ status: 'error', msg: 'Farmer not found' })
        }

        if (farmer.role !== 'farmer') {
            return res.status(403).send({ 
                status: 'error', msg: 'Access denied. Only farmers can view their products'
            })
        }

        const skip = (page - 1) * limit

        const totalProducts = await Product.countDocuments({ farmerId: farmer._id })

        const products = await Product.find({ farmerId: farmer._id }).sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean()

        return res.status(200).send({ 
            status: 'ok', msg: 'success', currentPage: page, totalPages: Math.ceil(totalProducts / limit),
            totalProducts, count: products.length, products
        })
    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'An error occurred while fetching my products' })
    }
})


// Update Product (Farmer)
router.post('/update', token, multer.array('images', 5), async (req: Request, res: Response) => {
    const { 
        productId, name, description, category, pricePerUnit, quantityAvailable, unit, location, isAvailable
    } = req.body as UpdateProductBody

    if (!productId) {
        return res.status(400).send({ status: 'error', msg: 'Product ID is required' })
    }

    try {
        const farmerId = (req as any).user._id

        // Find the product
        const product = await Product.findOne({ _id: productId, farmerId })

        if (!product) {
            return res.status(404).send({ status: 'error', msg: 'Product not found' })
        }

        // Ensure only the owner can update the product
        if (product.farmerId.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        // Ensure farmer can only upload products within their registered produce categories
        if (category) {
            const farmer: any = await User.findById((req as any).user._id)

            if (farmer && farmer.produceCategories && farmer.produceCategories.includes(category)) {
                return res.status(400).send({ 
                    status: 'error',
                    msg: 'You cannot assign a product to a category outside your registered produce categories.'
                })
            }
        }

         // Uploaded images
        const files = (req as any).files
        if (files && files.length > 0) {
            // Delete old images from Cloudinary
            for (const image of product.images) {
                try {
                    await cloudinary.uploader.destroy(image.id)
                } catch (err) {
                    console.log(err)
                }
            }

            const uploadedImages = []

            for (const file of files) {

                const upload = await cloudinary.uploader.upload(file.path, {
                    folder: 'products'
                })

                uploadedImages.push({
                    id: upload.public_id,
                    url: upload.secure_url
                })
            }

            product.images = uploadedImages
        }

        // Update fields
        product.name = name || product.name
        product.description = description || product.description
        product.pricePerUnit = pricePerUnit || product.pricePerUnit
        product.quantityAvailable = quantityAvailable || product.quantityAvailable
        product.unit = unit || product.unit
        product.category = category || product.category
        product.location = location || product.location

        if (isAvailable !== undefined) {
            product.isAvailable = isAvailable
        }

        await product.save()

        return res.status(200).send({ status: 'ok', msg: 'success', product })
    } catch (error: any) {
        console.log(error)
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'An error occurred while updating the product' })
    }
})


// Delete Product (Farmer)
router.post('/delete', token, async (req: Request, res: Response) => {
    const { productId } = req.body as ProductBody
    if (!productId) {
        return res.status(400).send({ status: 'error', msg: 'Product ID is required' })
    }

    try {
        const product: any = await Product.findById(productId)

        if (!product) {
            return res.status(404).send({ status: 'error', msg: 'Product not found' })
        }

        // Ensure only the owner can delete
        if (product.farmerId.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        // Delete images from Cloudinary
        if (product.images && product.images.length > 0) {
            for (const image of product.images) {
                try {
                    await cloudinary.uploader.destroy(image.id)
                } catch (err) {
                    console.log(err)
                }
            }
        }

        await Product.findByIdAndDelete(productId)

        return res.status(200).send({ status: 'ok', msg: 'success' })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'An error occurred while deleting the product' })
    }
})


// Toggle Product Availability
router.post('/toggle-availability', token, async (req: Request, res: Response) => {
    try {
        const { productId } = req.body

        if (!productId) {
            return res.status(400).send({ status: 'error', msg: 'Product ID is required' })
        }

        const product: any = await Product.findById(productId)

        if (!product) {
            return res.status(404).send({ status: 'error', msg: 'Product not found' })
        }

        // Ensure only the owner can update
        if (product.farmerId.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        // Toggle availability
        product.isAvailable = !product.isAvailable

        await product.save()

        return res.status(200).send({
            status: 'ok', msg: product.isAvailable ? 'Product is now available' : 'Product is now unavailable',
            product: { _id: product._id, isAvailable: product.isAvailable }
        })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'An error occurred' })
    }
})

export default router