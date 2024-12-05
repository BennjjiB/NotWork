import {
  CandyGuard,
  CandyMachine,
} from "@metaplex-foundation/mpl-candy-machine"
import {
  AddressLookupTableInput,
  KeypairSigner,
  Transaction,
  Umi,
  generateSigner,
  publicKey,
  signAllTransactions, defaultPublicKey,
} from "@metaplex-foundation/umi"
import {
  fetchAddressLookupTable
} from "@metaplex-foundation/mpl-toolbox"
import React, {Dispatch, SetStateAction, useMemo, useState} from "react"
import {
  chooseGuardToUse,
  mintArgsBuilder,
  buildTx,
  getRequiredCU,
} from "../utils/mintHelper"
import {verifyTx} from "../utils/verifyTx"
import {base58} from "@metaplex-foundation/umi/serializers"
import {Text, VStack} from "@chakra-ui/react"
import {Button} from "./ui/button"
import {registerReferralUsage} from "../utils/referral"
import {ReadonlyURLSearchParams, useSearchParams} from "next/navigation"
import {emitOpenDialog} from "../utils/events"

const mintClick = async (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  mintAmount: number,
  setLoadingText: Dispatch<SetStateAction<string>>,
  chestType: string,
  searchParams: ReadonlyURLSearchParams
) => {
  const guardToUse = chooseGuardToUse(candyGuard)
  if (!guardToUse.guards) {
    console.error("no guard defined!")
    return
  }

  try {
    // fetch LUT
    let tables: AddressLookupTableInput[] = []
    const lut = process.env.NEXT_PUBLIC_LUT
    if (lut) {
      const lutPubKey = publicKey(lut)
      const fetchedLut = await fetchAddressLookupTable(umi, lutPubKey)
      tables = [fetchedLut]
    }
    const mintTxs: Transaction[] = []
    let nftsigners = [] as KeypairSigner[]

    const latestBlockhash = (await umi.rpc.getLatestBlockhash({commitment: "finalized"}))

    const mintArgs = mintArgsBuilder(guardToUse)
    const nftMint = generateSigner(umi)
    const txForSimulation = buildTx(
      umi,
      candyMachine,
      candyGuard,
      nftMint,
      guardToUse,
      mintArgs,
      tables,
      latestBlockhash,
      1_400_000
    )
    const requiredCu = await getRequiredCU(umi, txForSimulation)

    for (let i = 0; i < mintAmount; i++) {
      const nftMint = generateSigner(umi)
      nftsigners.push(nftMint)
      const transaction = buildTx(
        umi,
        candyMachine,
        candyGuard,
        nftMint,
        guardToUse,
        mintArgs,
        tables,
        latestBlockhash,
        requiredCu
      )
      mintTxs.push(transaction)
    }
    if (!mintTxs.length) {
      console.error("no mint tx built!")
      return
    }

    setLoadingText(`Please sign`)
    const signedTransactions = await signAllTransactions(
      mintTxs.map((transaction, index) => ({
        transaction,
        signers: [umi.payer, nftsigners[index]],
      }))
    )

    let signatures: Uint8Array[] = []
    let amountSent = 0

    const sendPromises = signedTransactions.map((tx, index) => {
      return umi.rpc
        .sendTransaction(tx, {
          skipPreflight: true,
          maxRetries: 1,
          preflightCommitment: "confirmed",
          commitment: "confirmed"
        })
        .then((signature) => {
          console.log(
            `Transaction ${index + 1} resolved with signature: ${
              base58.deserialize(signature)[0]
            }`
          )
          amountSent = amountSent + 1
          signatures.push(signature)
          return {status: "fulfilled", value: signature}
        })
        .catch((error) => {
          console.error(`Transaction ${index + 1} failed:`, error)
          return {status: "rejected", reason: error}
        })
    })

    await Promise.allSettled(sendPromises)

    if (!(await sendPromises[0]).status) {
      // throw error that no tx was created
      throw new Error("no tx was created")
    }
    setLoadingText(`Finalizing transaction`,)

    const successfulMints = await verifyTx(umi, signatures, latestBlockhash, "confirmed")

    // Referral Program Logic ----------------------
    if (successfulMints.length > 0) {
      emitOpenDialog(true)
      await registerReferralUsage(searchParams, umi.payer.publicKey, chestType, successfulMints.length)
    }
  } catch (e) {
    console.error(`minting failed because of ${e}`)
  } finally {
    setLoadingText("")
  }
}

// Button UI --------------------------------------------
type Props = {
  text: String,
  mintAmount: number,
  sol: number | null,
  price: number
  chestType: string,
  umi: Umi,
  candyMachine: CandyMachine | undefined,
  candyGuard: CandyGuard | undefined,
  checkingCandyMachines: boolean
}

export function MintButton({
                             text,
                             mintAmount,
                             sol,
                             price,
                             chestType,
                             umi,
                             candyMachine,
                             candyGuard,
                             checkingCandyMachines
                           }: Props): React.ReactElement {

  const searchParams = useSearchParams()

  const [loadingText, setLoadingText] = useState<string>("")

  const disabled = useMemo(() => {
    return umi.payer.publicKey == defaultPublicKey() || (sol ?? 1000) <= price
  }, [umi, sol, price])

  const errorText = useMemo(() => {
    return umi.payer.publicKey == defaultPublicKey() ?
      "Please connect your wallet to mint" : "You don't have enough $SOL!"
  }, [umi])

  return (
    <VStack w={"100%"} alignItems={"start"}>
      <Button
        onClick={() =>
          mintClick(
            umi,
            candyMachine!,
            candyGuard!,
            mintAmount,
            setLoadingText,
            chestType,
            searchParams
          )
        }
        rounded="lg"
        w="100%"
        size="lg"
        backgroundColor="#FDB620"
        boxShadow="0 5px 0px #845536"
        _hover={{backgroundColor: "#DA9F21"}}
        _active={{backgroundColor: "#DA9F21", boxShadow: "0 2px 0px #845536", transform: "translateY(3px)"}}
        textStyle="2xl"
        fontWeight="bold"
        disabled={disabled || checkingCandyMachines}
        loading={loadingText.length != 0}
        loadingText={loadingText}
      >
        {text}
      </Button>
      {disabled ? (<Text color={"#FF0000"}>{errorText}</Text>) : null}
    </VStack>
  )
}
