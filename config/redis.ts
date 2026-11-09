import Redis from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()

const redis = new Redis(process.env.redis_url as string)
redis.on('connect', () => {
    console.log('Connected to Redis')
})

redis.on('error', (err) => {
    console.log('Error connecting to Redis:', err)
})

export default redis