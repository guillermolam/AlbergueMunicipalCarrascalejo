import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient: ReturnType<typeof createClient> | null = null

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    })
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error', err)
    })
    
    await redisClient.connect()
  }
  
  return redisClient
}

export async function setRedisKey(key: string, value: string, expireInSeconds = 3600) {
  try {
    const client = await getRedisClient()
    await client.setEx(key, expireInSeconds, value)
  } catch (error) {
    console.error('Error setting Redis key:', error)
  }
}

export async function getRedisKey(key: string) {
  try {
    const client = await getRedisClient()
    return await client.get(key)
  } catch (error) {
    console.error('Error getting Redis key:', error)
    return null
  }
}

export async function deleteRedisKey(key: string) {
  try {
    const client = await getRedisClient()
    await client.del(key)
  } catch (error) {
    console.error('Error deleting Redis key:', error)
  }
}

export async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}