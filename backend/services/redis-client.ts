import Redis from 'ioredis';
import { config } from 'dotenv';

config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
});

redis.on('error', (error) => {
  console.error('Redis error:', error);
});

export default redis;

// Helper functions
export const setWithExpiry = async (key: string, value: any, expiry: number) => {
  await redis.set(key, JSON.stringify(value), 'EX', expiry);
};

export const getWithExpiry = async (key: string) => {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
};

export const deleteKey = async (key: string) => {
  await redis.del(key);
};
