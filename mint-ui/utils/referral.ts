import {ReadonlyURLSearchParams} from "next/navigation"

export async function registerReferralUsage(searchParams: ReadonlyURLSearchParams, pubAddress: string, chestType: string, noOfChests: number) {
  const referralCode = searchParams.get('referralCode')
  const friendCode = searchParams.get('friendCode')

  let code = referralCode ?? friendCode
  if (!code || code == pubAddress) {
    return
  }

  await fetch('/api/promotion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: code,
      chestType: chestType,
      noOfChests: noOfChests,
      date: Date.now(),
      buyer: pubAddress
    }),
  })
}

export function createReferralLink(publicAddress: string): string {
  if (publicAddress == "11111111111111111111111111111111") {
    return ""
  }
  return "https://www.mint.playotium.com" + "?friendCode=" + publicAddress
}
