import type {NextApiRequest, NextApiResponse} from "next"
import {Redis} from '@upstash/redis'

// Initialize Redis
const redis = Redis.fromEnv()

function formatWalletAddress(address: string): string {
  if (address.length <= 12) {
    return address  // If the address is too short, return it as is
  }
  const start = address.slice(0, 6)
  const end = address.slice(-6)
  return `${start}...${end}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const data = req.body
    try {
      const insertData = {address: data.address, tickets: data.tickets}
      await redis.hset(data.date, insertData)
      await redis.zincrby("scores", data.tickets, data.address)
      return res.status(200).end()
    } catch (e) {
      return res.status(405).end(`Data base did not work!`)
    }
  } else if (req.method === "GET") {
    try {
      const address = req.query.address?.toString()
      const members: string[] = await redis.zrange('scores', 0, 5)
      let scores = await redis.zmscore("scores", members)
      let leaderboard = scores?.map((num, index) => ({
        address: formatWalletAddress(members[index]),
        tickets: num,
      }))?.sort((a, b) => b.tickets - a.tickets) ?? []
      if (!address || !members.includes(address)) {
        const score = await redis.zscore("scores", address)
        leaderboard.push({
          address: formatWalletAddress(address ?? "You"),
          tickets: score ?? 0
        })
      }
      return res.status(200).json(leaderboard)
    } catch (e) {
      return res.status(200).json({})
    }
  } else {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}