import express, { Request, Response } from 'express'
const router = express.Router()

import Product from '../models/product'
import User from '../models/user'
import token from '../middleware/token'
import { PRODUCE_CATEGORIES, ProduceCategory } from '../constants/user'


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