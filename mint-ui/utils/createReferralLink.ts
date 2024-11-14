export function createReferralLink(publicAddress: string): string {
  return "https://otium-mint.vercel.app" + "?friendCode=" + publicAddress
}