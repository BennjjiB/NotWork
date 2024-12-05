import {
  CandyGuard,
  CandyMachine,
  GuardGroup,
  DefaultGuardSet,
  DefaultGuardSetMintArgs,
  mintV2,
} from "@metaplex-foundation/mpl-candy-machine"
import {
  some,
  Umi,
  transactionBuilder,
  none,
  AddressLookupTableInput,
  Transaction,
  Signer,
  BlockhashWithExpiryBlockHeight,
} from "@metaplex-foundation/umi"
import {Connection} from "@solana/web3.js"
import {
  setComputeUnitPrice,
  setComputeUnitLimit
} from "@metaplex-foundation/mpl-toolbox"
import {toWeb3JsTransaction} from "@metaplex-foundation/umi-web3js-adapters"

export const chooseGuardToUse = (candyGuard: CandyGuard) => {
  if (candyGuard != null) {
    return {
      label: "default",
      guards: candyGuard.guards,
    }
  }
  console.error("No guards defined! No minting possible.")
  return {
    label: "default",
    guards: undefined,
  }
}

export const mintArgsBuilder = (
  guardToUse: GuardGroup<DefaultGuardSet>
) => {
  const guards = guardToUse.guards
  let mintArgs: Partial<DefaultGuardSetMintArgs> = {}
  if (guards.solPayment.__option === "Some") {
    mintArgs.solPayment = some({
      destination: guards.solPayment.value.destination,
    })
  }
  return mintArgs
}

export const buildTx = (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  nftMint: Signer,
  guardToUse:
    | GuardGroup<DefaultGuardSet>
    | {
    label: string;
    guards: undefined;
  },
  mintArgs: Partial<DefaultGuardSetMintArgs> | undefined,
  luts: AddressLookupTableInput[],
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  units: number
) => {
  let tx = transactionBuilder().add(
    mintV2(umi, {
      candyMachine: candyMachine.publicKey,
      collectionMint: candyMachine.collectionMint,
      collectionUpdateAuthority: candyMachine.authority,
      nftMint,
      group: guardToUse.label === "default" ? none() : some(guardToUse.label),
      candyGuard: candyGuard.publicKey,
      mintArgs,
      tokenStandard: candyMachine.tokenStandard,
    })
  )
  tx = tx.prepend(setComputeUnitLimit(umi, {units}))
  tx = tx.prepend(setComputeUnitPrice(umi, {microLamports: parseInt(process.env.NEXT_PUBLIC_MICROLAMPORTS ?? "1001")}))
  tx = tx.setAddressLookupTables(luts)
  tx = tx.setBlockhash(latestBlockhash)
  return tx.build(umi)
}

// simulate CU based on Sammys gist https://gist.github.com/stegaBOB/7c0cdc916db4524dd9c285f9e4309475
export const getRequiredCU = async (umi: Umi, transaction: Transaction) => {
  const defaultCU = 800_000
  const web3tx = toWeb3JsTransaction(transaction)
  let connection = new Connection(umi.rpc.getEndpoint(), "finalized")
  const simulatedTx = await connection.simulateTransaction(web3tx, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  })
  if (simulatedTx.value.err || !simulatedTx.value.unitsConsumed) {
    return defaultCU
  }
  return simulatedTx.value.unitsConsumed * 1.2 || defaultCU
}
