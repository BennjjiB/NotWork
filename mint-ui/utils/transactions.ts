import {publicKey, transactionBuilder, Umi} from "@metaplex-foundation/umi"
import {findAssociatedTokenPda, safeFetchMint, safeFetchToken, transferTokens} from "@metaplex-foundation/mpl-toolbox"

const RETRIEVER_WALLET_ADDRESS = 'F3FMWiKpMec9o4kcVXXAzPdBqJVxt69zhUwPYruF47X4' // Notwork receiver wallet address
const SOLANA_NOTWORK_TOKEN = publicKey('GcdLTfPGhdsX6zVjmcLchwwECzYqATHgk64sKZuadHKF') // Notwork token address
const SOLANA_NOTWORK_TOKEN_DECIMAL = BigInt(10 ** 9)

// Function to fetch Solana balance
export const fetchSolBalance = async (umi: Umi) => {
  try {
    return await umi.rpc.getBalance(umi.payer.publicKey)
  } catch (error) {
    console.error('Error fetching Sol balance:', error)
  }
}

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
    console.log(uiBalance)
    return Number(uiBalance)
  } catch (error) {
    console.error(error)
  }
}

export const handleSendToken = async (umi: Umi, amountToSend: string) => {
  const senderTokenAccount = findAssociatedTokenPda(umi, {
    mint: SOLANA_NOTWORK_TOKEN,
    owner: umi.payer.publicKey
  })

  const recipientPublicKey = publicKey(RETRIEVER_WALLET_ADDRESS)
  const receiverTokenAccount = findAssociatedTokenPda(umi, {
    mint: SOLANA_NOTWORK_TOKEN,
    owner: recipientPublicKey
  })

  let txnBuilder = transactionBuilder()

  const amountToSendBigInt = BigInt(amountToSend) * SOLANA_NOTWORK_TOKEN_DECIMAL

  txnBuilder = txnBuilder.add(
    transferTokens(umi, {
      source: senderTokenAccount,
      destination: receiverTokenAccount,
      amount: amountToSendBigInt,
    })
  )

  return txnBuilder.sendAndConfirm(umi, {send: {skipPreflight: true}})
}