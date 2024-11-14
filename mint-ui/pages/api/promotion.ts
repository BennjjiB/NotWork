import type {NextApiRequest, NextApiResponse} from "next"
import {Redis} from '@upstash/redis'

// Initialize Redis
const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const data = req.body
    try {
      await redis.hincrby(data.code, data.chestType, data.noOfChests)
      return res.status(200).end()
    } catch (e) {
      return res.status(405).end(`Data base did not work!`)
    }
  } else {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}