import {
  CandyGuard,
  CandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {GuardReturn} from "@/utils/checkerHelper";
import {
  AddressLookupTableInput,
  KeypairSigner,
  PublicKey,
  Transaction,
  Umi,
  createBigInt,
  generateSigner,
  publicKey,
  signAllTransactions,
} from "@metaplex-foundation/umi";
import {
  DigitalAsset,
  DigitalAssetWithToken,
  JsonMetadata,
  fetchDigitalAsset,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {mintText} from "@/settings";
import {
  fetchAddressLookupTable, setComputeUnitPrice,
} from "@metaplex-foundation/mpl-toolbox";
import {Dispatch, SetStateAction} from "react";
import {
  chooseGuardToUse,
  routeBuilder,
  mintArgsBuilder,
  GuardButtonList,
  buildTx,
  getRequiredCU,
} from "@/utils/mintHelper";
import {verifyTx} from "@/utils/verifyTx";
import {base58} from "@metaplex-foundation/umi/serializers";
import {Button} from "@/components/ui/button";
import {Tooltip} from "@/components/ui/tooltip";
import {Text, VStack} from "@chakra-ui/react";

const updateLoadingText = (
  loadingText: string | undefined,
  guardList: GuardReturn[],
  label: string,
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>
) => {
  const guardIndex = guardList.findIndex((g) => g.label === label);
  if (guardIndex === -1) {
    console.error("guard not found");
    return;
  }
  const newGuardList = [...guardList];
  newGuardList[guardIndex].loadingText = loadingText;
  setGuardList(newGuardList);
};

const fetchNft = async (
  umi: Umi,
  nftAdress: PublicKey,
) => {
  let digitalAsset: DigitalAsset | undefined;
  let jsonMetadata: JsonMetadata | undefined;
  try {
    digitalAsset = await fetchDigitalAsset(umi, nftAdress);
    jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.metadata.uri);
  } catch (e) {
    console.error(e);
  }

  return {digitalAsset, jsonMetadata};
};

const mintClick = async (
  umi: Umi,
  guard: GuardReturn,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  ownedTokens: DigitalAssetWithToken[],
  mintAmount: number,
  mintsCreated:
    | {
    mint: PublicKey;
    offChainMetadata: JsonMetadata | undefined;
  }[]
    | undefined,
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >,
  guardList: GuardReturn[],
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>,
  onOpen: () => void,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>
) => {
  const guardToUse = chooseGuardToUse(guard, candyGuard);
  if (!guardToUse.guards) {
    console.error("no guard defined!");
    return;
  }

  try {
    //find the guard by guardToUse.label and set minting to true
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = true;
    setGuardList(newGuardList);

    let routeBuild = await routeBuilder(umi, guardToUse, candyMachine);
    if (routeBuild && routeBuild.items.length > 0) {
      routeBuild = routeBuild.prepend(setComputeUnitPrice(umi, {microLamports: parseInt(process.env.NEXT_PUBLIC_MICROLAMPORTS ?? "1001")}));
      const latestBlockhash = await umi.rpc.getLatestBlockhash({commitment: "finalized"});
      routeBuild = routeBuild.setBlockhash(latestBlockhash)
      const builtTx = await routeBuild.buildAndSign(umi);
      const sig = await umi.rpc
        .sendTransaction(builtTx, {
          skipPreflight: true,
          maxRetries: 1,
          preflightCommitment: "finalized",
          commitment: "finalized"
        })
        .then((signature) => {
          return {status: "fulfilled", value: signature};
        })
        .catch((error) => {
          return {status: "rejected", reason: error, value: new Uint8Array};
        });
      if (sig.status === "fulfilled")
        await verifyTx(umi, [sig.value], latestBlockhash, "finalized");

    }

    // fetch LUT
    let tables: AddressLookupTableInput[] = [];
    const lut = process.env.NEXT_PUBLIC_LUT;
    if (lut) {
      const lutPubKey = publicKey(lut);
      const fetchedLut = await fetchAddressLookupTable(umi, lutPubKey);
      tables = [fetchedLut];
    } else {
    }

    const mintTxs: Transaction[] = [];
    let nftsigners = [] as KeypairSigner[];

    const latestBlockhash = (await umi.rpc.getLatestBlockhash({commitment: "finalized"}));

    const mintArgs = mintArgsBuilder(candyMachine, guardToUse, ownedTokens);
    const nftMint = generateSigner(umi);
    const txForSimulation = buildTx(
      umi,
      candyMachine,
      candyGuard,
      nftMint,
      guardToUse,
      mintArgs,
      tables,
      latestBlockhash,
      1_400_000,
      false
    );
    const requiredCu = await getRequiredCU(umi, txForSimulation);

    for (let i = 0; i < mintAmount; i++) {
      const nftMint = generateSigner(umi);
      nftsigners.push(nftMint);
      const transaction = buildTx(
        umi,
        candyMachine,
        candyGuard,
        nftMint,
        guardToUse,
        mintArgs,
        tables,
        latestBlockhash,
        requiredCu,
        false
      );
      console.log(transaction)
      mintTxs.push(transaction);
    }
    if (!mintTxs.length) {
      console.error("no mint tx built!");
      return;
    }

    updateLoadingText(`Please sign`, guardList, guardToUse.label, setGuardList);
    const signedTransactions = await signAllTransactions(
      mintTxs.map((transaction, index) => ({
        transaction,
        signers: [umi.payer, nftsigners[index]],
      }))
    );

    let signatures: Uint8Array[] = [];
    let amountSent = 0;

    const sendPromises = signedTransactions.map((tx, index) => {
      return umi.rpc
        .sendTransaction(tx, {
          skipPreflight: true,
          maxRetries: 1,
          preflightCommitment: "finalized",
          commitment: "finalized"
        })
        .then((signature) => {
          console.log(
            `Transaction ${index + 1} resolved with signature: ${
              base58.deserialize(signature)[0]
            }`
          );
          amountSent = amountSent + 1;
          signatures.push(signature);
          return {status: "fulfilled", value: signature};
        })
        .catch((error) => {
          console.error(`Transaction ${index + 1} failed:`, error);
          return {status: "rejected", reason: error};
        });
    });

    await Promise.allSettled(sendPromises);

    if (!(await sendPromises[0]).status) {
      // throw error that no tx was created
      throw new Error("no tx was created");
    }
    updateLoadingText(
      `finalizing transaction(s)`,
      guardList,
      guardToUse.label,
      setGuardList
    );

    const successfulMints = await verifyTx(umi, signatures, latestBlockhash, "finalized");

    updateLoadingText(
      "Fetching your NFT",
      guardList,
      guardToUse.label,
      setGuardList
    );

    // Filter out successful mints and map to fetch promises
    const fetchNftPromises = successfulMints.map((mintResult) =>
      fetchNft(umi, mintResult).then((nftData) => ({
        mint: mintResult,
        nftData,
      }))
    );

    const fetchedNftsResults = await Promise.all(fetchNftPromises);

    // Prepare data for setting mintsCreated
    let newMintsCreated: { mint: PublicKey; offChainMetadata: JsonMetadata }[] =
      [];
    fetchedNftsResults.map((acc) => {
      if (acc.nftData.digitalAsset && acc.nftData.jsonMetadata) {
        newMintsCreated.push({
          mint: acc.mint,
          offChainMetadata: acc.nftData.jsonMetadata,
        });
      }
      return acc;
    }, []);

    // Update mintsCreated only if there are new mints
    if (newMintsCreated.length > 0) {
      setMintsCreated(newMintsCreated);
      onOpen();
    }
  } catch (e) {
    console.error(`minting failed because of ${e}`);
  } finally {
    //find the guard by guardToUse.label and set minting to true
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = false;
    setGuardList(newGuardList);
    setCheckEligibility(true);
    updateLoadingText(undefined, guardList, guardToUse.label, setGuardList);
  }
};

// Button UI --------------------------------------------
type Props = {
  text: String,
  mintAmount: number,
  umi: Umi;
  guardList: GuardReturn[];
  candyMachine: CandyMachine | undefined;
  candyGuard: CandyGuard | undefined;
  ownedTokens: DigitalAssetWithToken[] | undefined;
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>;
  mintsCreated:
    | {
    mint: PublicKey;
    offChainMetadata: JsonMetadata | undefined;
  }[]
    | undefined;
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >;
  onOpen: () => void;
  setCheckEligibility: Dispatch<SetStateAction<boolean>>;
};

export function MintButton({
                             text,
                             mintAmount,
                             umi,
                             guardList,
                             candyMachine,
                             candyGuard,
                             ownedTokens = [], // provide default empty array
                             setGuardList,
                             mintsCreated,
                             setMintsCreated,
                             onOpen,
                             setCheckEligibility,
                           }: Props): JSX.Element {
  // remove duplicates from guardList
  //fucked up bugfix
  let filteredGuardlist = guardList.filter(
    (elem, index, self) =>
      index === self.findIndex((t) => t.label === elem.label)
  );
  if (filteredGuardlist.length === 0) {
    return <></>;
  }
  // Guard "default" can only be used to mint in case no other guard exists
  if (filteredGuardlist.length > 1) {
    filteredGuardlist = guardList.filter((elem) => elem.label != "default");
  }
  let buttonGuardList = [];
  for (const guard of filteredGuardlist) {
    const text = mintText.find((elem) => elem.label === guard.label);
    // find guard by label in candyGuard
    const group = candyGuard!.groups.find((elem) => elem.label === guard.label);
    let startTime = createBigInt(0);
    let endTime = createBigInt(0);
    if (group) {
      if (group.guards.startDate.__option === "Some") {
        startTime = group.guards.startDate.value.date;
      }
      if (group.guards.endDate.__option === "Some") {
        endTime = group.guards.endDate.value.date;
      }
    }

    let buttonElement: GuardButtonList = {
      label: guard ? guard.label : "default",
      allowed: guard.allowed,
      header: text ? text.header : "header missing in settings.tsx",
      mintText: text ? text.mintText : "mintText missing in settings.tsx",
      buttonLabel: text
        ? text.buttonLabel
        : "buttonLabel missing in settings.tsx",
      startTime,
      endTime,
      tooltip: guard.reason,
      maxAmount: guard.maxAmount,
    };
    buttonGuardList.push(buttonElement);
  }

  const listItems = buttonGuardList.map((buttonGuard) => (
    <VStack w={"100%"} alignItems={"start"}>
      <Button
        onClick={() =>
          mintClick(
            umi,
            buttonGuard,
            candyMachine!,
            candyGuard!,
            ownedTokens,
            mintAmount,
            mintsCreated,
            setMintsCreated,
            guardList,
            setGuardList,
            onOpen,
            setCheckEligibility
          )
        }
        rounded="lg"
        w="100%"
        key={buttonGuard.label}
        size="lg"
        backgroundColor="#FDB620"
        boxShadow="0 5px 0px #845536"
        _hover={{backgroundColor: "#DA9F21"}}
        _active={{backgroundColor: "#DA9F21", boxShadow: "0 2px 0px #845536", transform: "translateY(3px)"}}
        textStyle="2xl"
        fontWeight="bold"
        disabled={!buttonGuard.allowed}
      >
        {text}
      </Button>
      {!buttonGuard.allowed ? (<Text color={"#FF0000"}>{buttonGuard.tooltip}</Text>) : null}
    </VStack>
  ));

  return <>{listItems}</>;
}
