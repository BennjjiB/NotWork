import {
  none,
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import {DigitalAssetWithToken, JsonMetadata} from "@metaplex-foundation/mpl-token-metadata";
import React, {Dispatch, SetStateAction, useEffect, useMemo, useState} from "react";
import {useUmi} from "@/utils/useUmi";
import {
  fetchCandyMachine,
  safeFetchCandyGuard,
  CandyGuard,
  CandyMachine,
  AccountVersion
} from "@metaplex-foundation/mpl-candy-machine"
import styles from "../styles/Home.module.css";
import {guardChecker} from "@/utils/checkAllowed";
import {
  Heading,
  Text,
  useDisclosure,
  Image,
  Box,
  VStack,
  Flex,
  HStack,
  For, Center
} from '@chakra-ui/react';
import {ButtonList} from "@/components/mintButton";
import {GuardReturn} from "@/utils/checkerHelper";
import NextImage, {StaticImageData} from 'next/image'
import {useSolanaTime} from "@/utils/SolanaTimeContext";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import '@solana/wallet-adapter-react-ui/styles.css';
import knightAvatar from 'assets/KnightAvatar.png';
import knight_chest_image from 'assets/Knights_Chest.png';
import lord_chest_image from 'assets/Lords_Chest.png';
import king_chest_image from 'assets/Kings_Chest.png';
import {StepperInput} from "@/components/ui/stepper-input";
import {Tag} from "@/components/ui/tag";
import {image} from "@/settings";
import {ValueChangeDetails} from "@zag-js/number-input";

// Fetches candy machines and guards
const fetchCandyMachineAndGuard = (
  umi: Umi,
  candyMachineId: string,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  firstRun: boolean,
  setfirstRun: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();

  useEffect(() => {
    (async () => {
      if (checkEligibility) {
        if (!candyMachineId) {
          console.error("No candy machine in .env!");
        }
        let candyMachine;
        try {
          candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId));
          //verify CM Version
          if (candyMachine.version != AccountVersion.V2) {
            console.error("Please use latest sugar to create your candy machine. Need Account Version 2!");
            return;
          }
        } catch (e) {
          console.error(e);
        }
        setCandyMachine(candyMachine);
        if (!candyMachine) {
          return;
        }
        let candyGuard;
        try {
          candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority);
        } catch (e) {
          console.error(e);
        }
        if (!candyGuard) {
          return;
        }
        setCandyGuard(candyGuard);
        if (firstRun) {
          setfirstRun(false)
        }
      }
    })();
  }, [umi, checkEligibility]);
  return {candyMachine, candyGuard};
};


export default function Home() {
  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const {open: isShowNftOpen, onOpen: onShowNftOpen, onClose: onShowNftClose} = useDisclosure();
  const {open: isInitializerOpen, onOpen: onInitializerOpen, onClose: onInitializerClose} = useDisclosure();
  const [mintsCreated, setMintsCreated] = useState<{
    mint: PublicKey,
    offChainMetadata: JsonMetadata | undefined
  }[] | undefined>();
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    {label: "startDefault", allowed: false, maxAmount: 0},
  ]);
  const [firstRun, setFirstRun] = useState(true);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);

  // TODO: Do this for all 3 candy machines ---------------------
  if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
    console.error("No candy machine in .env!")
  }

  // Computes the public key of candy machine
  const candyMachineId: PublicKey = useMemo(() => {
    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      return publicKey("11111111111111111111111111111111");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    candyMachine,
    candyGuard
  } = fetchCandyMachineAndGuard(umi, candyMachineId, checkEligibility, setCheckEligibility, firstRun, setFirstRun);

  // ---------------------------------

  useEffect(() => {
    const checkEligibilityFunc = async () => {
      if (!candyMachine || !candyGuard || !checkEligibility || isShowNftOpen) {
        return;
      }
      setFirstRun(false);

      const {guardReturn, ownedTokens} = await guardChecker(
        umi, candyGuard, candyMachine, solanaTime
      );

      setOwnedTokens(ownedTokens);
      setGuards(guardReturn);
      setIsAllowed(false);

      // Checks if all guards are allowed
      let allowed = false;
      for (const guard of guardReturn) {
        if (guard.allowed) {
          allowed = true;
          break;
        }
      }

      setIsAllowed(allowed);
      setLoading(false);
    };

    checkEligibilityFunc();
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umi, checkEligibility, firstRun]);

  // ---------- UI ----------
  /*
  const PageContent = () => {
    return (
        <Card>
          <CardHeader>
            <Flex minWidth='max-content' alignItems='center' gap='2'>
              <Box>
                <Heading size='md'>{headerText}</Heading>
              </Box>
              {loading ? (<></>) : (
                <Flex justifyContent="flex-end" marginLeft="auto">
                  <Box background={"teal.100"} borderRadius={"5px"} minWidth={"50px"}
                       minHeight={"50px"} p={2}>
                    <VStack>
                      <Text fontSize={"sm"}>Available NFTs:</Text>
                      <Text
                        fontWeight={"semibold"}>{Number(candyMachine?.data.itemsAvailable) - Number(candyMachine?.itemsRedeemed)}/{Number(candyMachine?.data.itemsAvailable)}</Text>
                    </VStack>
                  </Box>
                </Flex>
              )}
            </Flex>
          </CardHeader>

          <CardBody>
            <Center>
              <Box
                rounded={'lg'}
                mt={-12}
                pos={'relative'}>
                <Image
                  rounded={'lg'}
                  height={230}
                  objectFit={'cover'}
                  alt={"project Image"}
                  src={image}
                />
              </Box>
            </Center>
            <Stack separator={<StackSeparator/>}>
              {loading ? (
                <div>
                  <Separator my="10px"/>
                  <Skeleton height="30px" my="10px"/>
                  <Skeleton height="30px" my="10px"/>
                  <Skeleton height="30px" my="10px"/>
                </div>
              ) : (
                <ButtonList
                  guardList={guards}
                  candyMachine={candyMachine}
                  candyGuard={candyGuard}
                  umi={umi}
                  ownedTokens={ownedTokens}
                  setGuardList={setGuards}
                  mintsCreated={mintsCreated}
                  setMintsCreated={setMintsCreated}
                  onOpen={onShowNftOpen}
                  setCheckEligibility={setCheckEligibility}
                />
              )}
            </Stack>
          </CardBody>
        </Card>
        {umi.identity.publicKey === candyMachine?.authority ? (
            <>
              <Center>
                <Button backgroundColor={"red.200"} marginTop={"10"} onClick={onInitializerOpen}>Initialize
                  Everything!</Button>
              </Center>
              <Dialog isOpen={isInitializerOpen} onClose={onInitializerClose}>
                <ModalOverlay/>
                <DialogContent maxW="600px">
                  <DialogHeader>Initializer</DialogHeader>
                  <ModalCloseButton/>
                  <DialogBody>
                    < InitializeModal umi={umi} candyMachine={candyMachine} candyGuard={candyGuard}/>
                  </DialogBody>
                </DialogContent>
              </Dialog>

            </>)
          :
          (<></>)
        }

        <Modal isOpen={isShowNftOpen} onClose={onShowNftClose}>
          <ModalOverlay/>
          <ModalContent>
            <ModalHeader>Your minted NFT:</ModalHeader>
            <ModalCloseButton/>
            <ModalBody>
              <ShowNft nfts={mintsCreated}/>
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  };
*/

  const [chestType, setChestType] = useState("Knight");
  const [amount, setAmount] = useState("1");

  function getAttributes(name: string) {
    switch (name) {
      case "Knight":
        return [{name: "2 Card Packs"}, {name: "1 Mythical Chance"}, {name: "2.5% Airdrop Boost"}, {name: "1 Knight Cardback"}]
      case "Lord":
        return [{name: "5 Card Packs"}, {name: "1 Mythical Chance"}, {name: "5% Airdrop Boost"}, {name: "1 Lord Cardback"}]
      case "King":
        return [{name: "10 Card Packs"}, {name: "1 Mythical Card"}, {name: "10% Airdrop Boost"}, {name: "1 Free pack per season"}, {name: "1 King Cardback"}]
    }
  }

  const PageContent = () => {
    return (
      <Flex direction="column" gap={{base: "2rem", lg: "3rem"}}>
        <VStack gap={{base: "0.5rem", lg: "1rem"}}>
          <Heading textAlign="center" textStyle={{base: "4xl", lg: "6xl"}} className={styles.goldEffect}>Secure your
            Founder
            Chest</Heading>
          <Text textAlign="center">
            Prepare to immerse yourself in the thrilling world of Otium with our exclusive presale!
            For a limited time you have the chance to purchase three unique tiers of chests, each brimming with
            powerful
            items.
          </Text>
        </VStack>

        <HStack gap="4rem" h={"100%"}>
          <Detail></Detail>
          <MintContent></MintContent>
        </HStack>
      </Flex>
    )
  }

  const Detail = () => {
    return (
      <VStack hideBelow={"lg"} h="100%" flex="0.7" gap="4px">
        <Image h="100%" aspectRatio={4 / 3} fit="contain" asChild>
          <NextImage src={knightAvatar} alt="..."/>
        </Image>
        <VStack gap="0.5rem">
          <Heading size="3xl" className={styles.goldEffect}>Mythical Gem</Heading>
          <Text textAlign="center">
            Receive a random card with the chances of mythical. You will always receive at least a rare card.
          </Text>
        </VStack>
      </VStack>
    )
  }

  const MintContent = () => {
    return (
      <Flex direction="column" align="flex-start" gap={{base: "1rem"}} flex="1" h="100%">
        <VStack align="flex-start" gap="0.5rem">
          <Heading>Select your chest</Heading>
          <HStack gap="2rem">
            <For each={[
              {name: "Knight", image: knight_chest_image},
              {name: "Lord", image: lord_chest_image},
              {name: "King", image: king_chest_image}
            ]}>
              {(item, index) => (
                <ChestTile name={item.name} image={item.image}/>
              )}
            </For>
          </HStack>
        </VStack>

        <VStack align="flex-start" gap="0.5rem">
          <Heading>Chest Reward</Heading>
          <HStack flexWrap="wrap">
            <For
              each={getAttributes(chestType)}>
              {(item, index) => (
                <Tag variant="outline" rounded="md" size={{base: "md", xl: "lg"}}>
                  <Text fontWeight="medium" paddingX="4" paddingY="2" color="white">{item.name}</Text>
                </Tag>
              )}
            </For>
          </HStack>
        </VStack>

        <VStack align="flex-start" gap="0.5rem">
          <Heading>Amount</Heading>
          <StepperInput color="white" min={1} value={amount} onValueChange={(details: ValueChangeDetails) => {
            setAmount(details.value)
          }}/>
        </VStack>
        <ButtonList
          guardList={guards}
          candyMachine={candyMachine}
          candyGuard={candyGuard}
          umi={umi}
          ownedTokens={ownedTokens}
          setGuardList={setGuards}
          mintsCreated={mintsCreated}
          setMintsCreated={setMintsCreated}
          onOpen={onShowNftOpen}
          setCheckEligibility={setCheckEligibility}
        />
      </Flex>
    )
  }

  interface ChestTileProps {
    name: string
    image: StaticImageData
  }

  const ChestTile = (props: ChestTileProps) => {
    return (
      <VStack cursor="pointer" onClick={() => setChestType(props.name)}>
        <Image className={(chestType == props.name) ? styles.chestBorder : ""}
               transition="all .05s ease-in-out"
               _hover={{transform: "scale(1.01)"}}
               fit="cover"
               rounded="2xl"
               aspectRatio={1 / 1}
               asChild>
          <NextImage src={props.image} alt="..."/>
        </Image>
        <Text>
          {props.name}
        </Text>
      </VStack>
    )
  }


  return (
    <main>
      <div className={styles.wallet}>
        <WalletMultiButton/>
      </div>
      <div className={styles.content}>
        <PageContent></PageContent>
      </div>
    </main>
  );
}
