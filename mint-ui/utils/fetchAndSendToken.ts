import {publicKey, transactionBuilder, Umi} from "@metaplex-foundation/umi"
import {findAssociatedTokenPda, safeFetchMint, safeFetchToken, transferTokens} from "@metaplex-foundation/mpl-toolbox"

const SOLANA_NOTWORK_TOKEN = publicKey('GcdLTfPGhdsX6zVjmcLchwwECzYqATHgk64sKZuadHKF') // Notwork token address
const RETRIEVER_WALLET_ADDRESS = publicKey('J1LDGfBwEpyWXaYiUmAMVPYAyDtoDgwipfRmTgjThrGg') // Notwork receiver wallet address
const SOLANA_NOTWORK_TOKEN_DECIMAL = BigInt(10 ** 9)

export const fetchTokenBalance = async (umi: Umi) => {
  try {
    const associatedTokenAccount = findAssociatedTokenPda(umi, {
      mint: SOLANA_NOTWORK_TOKEN,
      owner: umi.payer.publicKey,
    })
    const mintData = await safeFetchMint(umi, SOLANA_NOTWORK_TOKEN)
    const userPublicKeyData = await safeFetchToken(
      umi,
      associatedTokenAccount[0]
    )
    const balanceInLamports = userPublicKeyData?.amount

    let uiBalance = BigInt(0)
    if (balanceInLamports && mintData) {
      uiBalance = balanceInLamports / BigInt(10 ** mintData?.decimals)
    } else {
      console.error("Balance or mint data not available.")
    }
    return Number(uiBalance)
  } catch (error) {
    console.error(error)
  }
}

export const handleSendToken = async (umi: Umi, amountToSend: number) => {
  const senderTokenAccount = findAssociatedTokenPda(umi, {
    mint: SOLANA_NOTWORK_TOKEN,
    owner: umi.payer.publicKey
  })

  const receiverTokenAccount = findAssociatedTokenPda(umi, {
    mint: SOLANA_NOTWORK_TOKEN,
    owner: RETRIEVER_WALLET_ADDRESS
  })

  let txnBuilder = transactionBuilder()
  const amountToSendBigInt = BigInt(amountToSend) * SOLANA_NOTWORK_TOKEN_DECIMAL
  const txn = transferTokens(umi, {
    source: senderTokenAccount,
    destination: receiverTokenAccount,
    authority: umi.identity,
    amount: amountToSendBigInt,
  })
  txnBuilder = txnBuilder.add(txn)
  return txnBuilder.sendAndConfirm(umi, {send: {skipPreflight: true}, confirm: {commitment: "confirmed"}})
}