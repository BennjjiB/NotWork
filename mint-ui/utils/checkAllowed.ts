import {
  AddressGate,
  CandyGuard,
  CandyMachine,
  EndDate,
  FreezeSolPayment,
  FreezeTokenPayment,
  GuardSet,
  NftBurn,
  NftGate,
  NftPayment,
  RedeemedAmount,
  SolPayment,
  StartDate,
  TokenBurn,
  TokenGate,
  TokenPayment,
} from "@metaplex-foundation/mpl-candy-machine"
import {
  SolAmount,
  Some,
  Umi,
  assertAccountExists,
  publicKey,
  sol,
} from "@metaplex-foundation/umi"
import {
  addressGateChecker,
  allowlistChecker,
  checkTokensRequired,
  checkSolBalanceRequired,
  mintLimitChecker,
  ownedNftChecker,
  GuardReturn,
  allocationChecker,
  calculateMintable,
} from "./checkerHelper"
import {allowLists} from "../allowlist"
import {
  DigitalAssetWithToken,
  fetchAllDigitalAssetWithTokenByOwner,
} from "@metaplex-foundation/mpl-token-metadata"
import {checkAtaValid} from "./validateConfig"

export const guardChecker = async (
  umi: Umi,
  candyGuard: CandyGuard,
  candyMachine: CandyMachine,
  solanaTime: bigint
) => {
  let guardReturn: GuardReturn[] = []
  let ownedTokens: DigitalAssetWithToken[] = []
  if (!candyGuard) {
    if (guardReturn.length === 0) {
      //guardReturn.push({ label: "default", allowed: false });
    }
    return {guardReturn, ownedNfts: ownedTokens}
  }

  let guardsToCheck: { label: string; guards: GuardSet }[] = candyGuard.groups
  guardsToCheck.push({label: "default", guards: candyGuard.guards})

  // no wallet connected. return dummies
  const dummyPublicKey = publicKey("11111111111111111111111111111111")
  if (
    umi.identity.publicKey === dummyPublicKey ||
    Number(candyMachine.data.itemsAvailable) - Number(candyMachine.itemsRedeemed) === 0
  ) {
    for (const eachGuard of guardsToCheck) {
      guardReturn.push({
        label: eachGuard.label,
        allowed: false,
        reason: "Please connect your wallet to mint",
        maxAmount: 0
      })
    }
    return {guardReturn, ownedNfts: ownedTokens}
  }

  if (candyMachine.authority === umi.identity.publicKey) {
    checkAtaValid(umi, guardsToCheck)
  }

  let solBalance: SolAmount = sol(0)
  if (checkSolBalanceRequired(guardsToCheck)) {
    try {
      const account = await umi.rpc.getAccount(umi.identity.publicKey)
      assertAccountExists(account)
      solBalance = account.lamports
    } catch (e) {
      for (const eachGuard of guardsToCheck) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Wallet does not exist. Do you have SOL?",
          maxAmount: 0
        })
      }
      return {guardReturn, ownedNfts: ownedTokens}
    }
  }

  for (const eachGuard of guardsToCheck) {
    const singleGuard = eachGuard.guards
    let mintableAmount = Number(candyMachine.data.itemsAvailable) - Number(candyMachine.itemsRedeemed)

    if (singleGuard.solPayment.__option === "Some") {
      const solPayment = singleGuard.solPayment as Some<SolPayment>
      let payableAmount = 0
      if (solPayment.value.lamports.basisPoints !== BigInt(0)) {
        payableAmount = Number(solBalance.basisPoints) / Number(solPayment.value.lamports.basisPoints)
      }
      mintableAmount = calculateMintable(mintableAmount, Number(payableAmount))

      if (solPayment.value.lamports.basisPoints > solBalance.basisPoints) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough SOL!",
          maxAmount: 0
        })
        console.info(`${eachGuard.label} SolPayment not enough SOL!`)
        continue
      }
    }

    guardReturn.push({label: eachGuard.label, allowed: true, maxAmount: mintableAmount})
  }
  return {guardReturn, ownedTokens}
}
