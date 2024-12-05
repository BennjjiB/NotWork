import {
  createTree,
  findLeafAssetIdPda,
  getAssetWithProof, mintToCollectionV1,
  mintV1,
  mplBubblegum,
  parseLeafFromMintV1Transaction,
  verifyCollection,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
  sol,
} from "@metaplex-foundation/umi";
import {createUmi} from "@metaplex-foundation/umi-bundle-defaults";
import {irysUploader} from "@metaplex-foundation/umi-uploader-irys";
import fs from "fs";
import bs58 from 'bs58'

const createMerkleTree = async () => {
  //
  // ** Set Up Umi **
  //

  const umi = createUmi("https://greatest-ancient-log.solana-mainnet.quiknode.pro/d68d8dfd2f69f6ac20b9190897d8376bc3d1f70e/")
    .use(mplBubblegum())
    .use(mplTokenMetadata())
    .use(
      irysUploader({
        // mainnet address: "https://node1.irys.xyz"
        // devnet address: "https://devnet.irys.xyz"
        address: 'https://node1.irys.xyz',
      })
    )

  // Generate a new keypair signer.
  const signer = generateSigner(umi)

  // You will need to us fs and navigate the filesystem to
  // load the wallet you wish to use via relative pathing.
  const secretKey = bs58.decode("43n9k1nb1exAtTmTSFYB9iCPGps2muwa6YBAiMXEKFEtYRs6ivR6cKqjNw1T9tQ2RSCMVDnrZ4RSTKScFTmmZFaE")
  let keypair = umi.eddsa.createKeypairFromSecretKey(secretKey)

  // Load the keypair into umi.
  umi.use(keypairIdentity(keypair))

  //
  // ** Create a Merkle Tree **
  //

  const merkleTree = generateSigner(umi)

  console.log(
    'Merkle Tree Public Key:',
    merkleTree.publicKey,
    '\nStore this address as you will need it later.'
  )

  //   Create a tree with the following parameters.
  //   This tree will cost approximately 7.7 SOL to create with a maximum
  //   capacity of 1,000,000 leaves/nfts. You may have to airdrop some SOL
  //   to the umi identity account before running this script.

  console.log('Creating Merkle Tree...')
  const createTreeTx = await createTree(umi, {
    merkleTree,
    maxDepth: 11,
    maxBufferSize: 32,
    canopyDepth: 8
  })

  await createTreeTx.sendAndConfirm(umi)
}

// Create the wrapper function
const createCnft = async (name, uri, merkleTree = "H5e57xX8duPLkrc686rYJ4dKtB6u3Eb8etrFLeBvJZ1f") => {
  //
  // ** Mint a Compressed NFT to the Merkle Tree **
  //

  //
  // If you do not wish to mint a NFT to a collection you can set the collection
  // field to `none()`.
  //
  console.log("Sending")
  try {
    const {signature} = await mintToCollectionV1(umi, {
      leafOwner: umi.identity.publicKey,
      merkleTree: merkleTree,
      collectionMint: "AfgLivczGEy9em6SUXLTy47Teq2aUG9rDnePrPgNmKme",
      metadata: {
        name: name,
        uri: uri, // Either use `nftMetadataUri` or a previously uploaded uri.
        sellerFeeBasisPoints: 500, // 5%
        collection: {key: "AfgLivczGEy9em6SUXLTy47Teq2aUG9rDnePrPgNmKme", verified: false},
        creators: [
          {address: umi.identity.publicKey, verified: true, share: 100},
        ],
      },
    }).sendAndConfirm(umi, {send: {commitment: 'finalized'}})
    console.log("Minted one NFT")
  } catch (e) {
    console.log("Failed")
  }
  //
  // ** Fetching Asset **
  //

  //
  // Here we find the asset ID of the compressed NFT using the leaf index of the mint transaction
  // and then log the asset information.
  //
  /*
    console.log('Finding Asset ID...')
    const leaf = await parseLeafFromMintV1Transaction(umi, signature)
    const assetId = findLeafAssetIdPda(umi, {
      merkleTree: merkleTree,
      leafIndex: leaf.nonce,
    })

    console.log('Compressed NFT Asset ID:', assetId.toString())

    // Fetch the asset using umi rpc with DAS.
    const asset = await umi.rpc.getAsset(assetId[0])

    console.log(asset)
   */
}


const umi = createUmi("https://greatest-ancient-log.solana-mainnet.quiknode.pro/d68d8dfd2f69f6ac20b9190897d8376bc3d1f70e/")
  .use(mplBubblegum())
  .use(mplTokenMetadata())
  .use(
    irysUploader({
      // mainnet address: "https://node1.irys.xyz"
      // devnet address: "https://devnet.irys.xyz"
      address: "https://node1.irys.xyz",
    })
  )

// Generate a new keypair signer.
const signer = generateSigner(umi)

// You will need to us fs and navigate the filesystem to
// load the wallet you wish to use via relative pathing.
const secretKey = bs58.decode("43n9k1nb1exAtTmTSFYB9iCPGps2muwa6YBAiMXEKFEtYRs6ivR6cKqjNw1T9tQ2RSCMVDnrZ4RSTKScFTmmZFaE")
let keypair = umi.eddsa.createKeypairFromSecretKey(secretKey)

// Load the keypair into umi.
umi.use(keypairIdentity(keypair))


/*
// Knight
for (let i = 1; i <= 800; i++) {
  createCnft(
    "Knight's Chest",
    "https://5robp2wavehcrxhz5aadosmw2lc7xn3o75opxotqaypxsnf44tua.arweave.net/7FwX6sCpDijc-egAN0mW0sX7t27_XPu6cAYfeTS85Og")
}

// Lord
for (let i = 1; i <= 400; i++) {
  createCnft(
    "Lord's Chest",
    "https://cevir7hvowceybnl6rnl63vvkzyg6dcunrgqm5ve6tokzsbfl3sq.arweave.net/ESqI_PV1hEwFq_Rav261VnBvDFRsTQZ2pPTcrMglXuU")
}


let timeoutSeconds = 1
for (let i = 1; i <= 200; i++) {
  setTimeout(() => {
      createCnft(
        "Knight's Chest",
        "https://5robp2wavehcrxhz5aadosmw2lc7xn3o75opxotqaypxsnf44tua.arweave.net/7FwX6sCpDijc-egAN0mW0sX7t27_XPu6cAYfeTS85Og")
    },
    1000 * timeoutSeconds
  )
  timeoutSeconds++
}
 */