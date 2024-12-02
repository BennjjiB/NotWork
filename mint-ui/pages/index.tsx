import {
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi"
import {DigitalAssetWithToken, JsonMetadata} from "@metaplex-foundation/mpl-token-metadata"
import React, {Dispatch, SetStateAction, useEffect, useMemo, useState} from "react"
import {useUmi} from "../utils/useUmi"
import {
  fetchCandyMachine,
  safeFetchCandyGuard,
  CandyGuard,
  CandyMachine,
} from "@metaplex-foundation/mpl-candy-machine"
import styles from "../styles/Home.module.css"
import {guardChecker} from "../utils/checkAllowed"
import {
  Heading,
  Text,
  Image,
  VStack,
  Flex,
  HStack,
  For, Center
} from '@chakra-ui/react'
import NextImage, {StaticImageData} from 'next/image'
import '@solana/wallet-adapter-react-ui/styles.css'
import knightAvatar from 'public/KnightAvatar.png'
import lordAvatar from 'public/Lord_Avatar.png'
import kingAvatar from 'public/King_Avatar.png'
import knight_chest_image from 'public/Knights_Chest.png'
import lord_chest_image from 'public/Lords_Chest.png'
import king_chest_image from 'public/Kings_Chest.png'
import referral_image from 'public/referral_image.png'
import {ToastContainer} from "react-toastify"
import 'react-toastify/dist/ReactToastify.css'
import {StepperInput} from "../components/ui/stepper-input"
import {useSolanaTime} from "../utils/SolanaTimeContext"
import {GuardReturn} from "../utils/checkerHelper"
import {Tag} from "../components/ui/tag"
import {MintButton} from "../components/mintButton"
import {
  DialogBody, DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
} from "../components/ui/dialog"
import {useOpenDialogListener} from "../utils/events"
import {ClipboardIconButton, ClipboardInput, ClipboardRoot} from "../components/ui/clipboard"
import {InputGroup} from "../components/ui/input-group"
import {createReferralLink, registerReferralUsage} from "../utils/referral"
import {useSearchParams} from "next/navigation"
import {Button} from "../components/ui/button"
import {registerRaffleTickets} from "../utils/registerRaffleTicket"

// Fetches candy machines and guards
const useCandyMachine = (
  umi: Umi,
  candyMachineId: string,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  firstRun: boolean,
  setfirstRun: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>()
  const [candyGuard, setCandyGuard] = useState<CandyGuard>()

  useEffect(() => {
    (async () => {
      if (checkEligibility) {
        if (!candyMachineId) {
          console.error("No candy machine in .env!")
          return
        }
        let candyMachine
        try {
          candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId))
        } catch (e) {
          console.error(e)
        }
        setCandyMachine(candyMachine)
        if (!candyMachine) {
          return
        }
        let candyGuard
        try {
          candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority)
        } catch (e) {
          console.error(e)
        }
        if (!candyGuard) {
          return
        }
        setCandyGuard(candyGuard)
        if (firstRun) {
          setfirstRun(false)
        }
      }
    })()
  }, [umi, candyMachineId, firstRun, setfirstRun, checkEligibility])
  return {candyMachine, candyGuard}
}

export default function Home() {
  const umi = useUmi()
  const solanaTime = useSolanaTime()
  const [mintsCreated, setMintsCreated] = useState<{
    mint: PublicKey,
    offChainMetadata: JsonMetadata | undefined
  }[] | undefined>()
  const [isAllowed, setIsAllowed] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>()
  const [guards, setGuards] = useState<GuardReturn[]>([
    {label: "startDefault", allowed: false, maxAmount: 0},
  ])
  const [firstRun, setFirstRun] = useState(true)
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true)


  // Computes the public key of candy machines
  const knightMachineId: PublicKey = useMemo(() => {
    return publicKey(process.env.NEXT_PUBLIC_KNIGHT_CANDY_MACHINE_ID!)
  }, [])
  const lordMachineId: PublicKey = useMemo(() => {
    return publicKey(process.env.NEXT_PUBLIC_LORD_CANDY_MACHINE_ID!)
  }, [])
  const kingMachineId: PublicKey = useMemo(() => {
    return publicKey(process.env.NEXT_PUBLIC_KING_CANDY_MACHINE_ID!)
  }, [])

  const knightCandyMachine = useCandyMachine(umi, knightMachineId, checkEligibility, setCheckEligibility, firstRun, setFirstRun)
  const lordCandyMachine = useCandyMachine(umi, lordMachineId, checkEligibility, setCheckEligibility, firstRun, setFirstRun)
  const kingCandyMachine = useCandyMachine(umi, kingMachineId, checkEligibility, setCheckEligibility, firstRun, setFirstRun)
  // ---------------------------------

  useEffect(() => {
    const checkEligibilityFunc = async (candyMachine: CandyMachine | undefined, candyGuard: CandyGuard | undefined) => {
      if (!candyMachine || !candyGuard || !checkEligibility) {
        return
      }
      setFirstRun(false)

      const {guardReturn, ownedTokens} = await guardChecker(
        umi, candyGuard, candyMachine, solanaTime
      )

      setOwnedTokens(ownedTokens)
      setGuards(guardReturn)
      setIsAllowed(false)

      // Checks if all guards are allowed
      let allowed = false
      for (const guard of guardReturn) {
        if (guard.allowed) {
          allowed = true
          break
        }
      }

      setIsAllowed(allowed)
      setLoading(false)
    }

    void checkEligibilityFunc(knightCandyMachine.candyMachine, knightCandyMachine.candyGuard)
    void checkEligibilityFunc(lordCandyMachine.candyMachine, lordCandyMachine.candyGuard)
    void checkEligibilityFunc(kingCandyMachine.candyMachine, kingCandyMachine.candyGuard)
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umi, checkEligibility, firstRun])


  // ---------- UI ----------
  const [chestType, setChestType] = useState("Knight")

  function getCandyMachine(name: string): CandyMachine {
    switch (name) {
      case "Knight":
        return knightCandyMachine.candyMachine!
      case "Lord":
        return lordCandyMachine.candyMachine!
      case "King":
        return kingCandyMachine.candyMachine!
      default:
        console.log("CandyMachineIs not allowed")
        return knightCandyMachine.candyMachine!
    }
  }

  function getCandyGuard(name: string): CandyGuard {
    switch (name) {
      case "Knight":
        return knightCandyMachine.candyGuard!
      case "Lord":
        return lordCandyMachine.candyGuard!
      case "King":
        return kingCandyMachine.candyGuard!
      default:
        console.log("CandyMachineIs not allowed")
        return knightCandyMachine.candyGuard!
    }
  }

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

  function getPrice(name: string, amount: string): number {
    switch (name) {
      case "Knight":
        return +amount * 0.125
      case "Lord":
        return +amount * 0.25
      case "King":
        return +amount * 0.55
      default:
        return 0
    }
  }

  function getButtonText(name: string, amount: string): string {
    return "Mint for " + getPrice(name, amount).toFixed(3) + "Sol"
  }

  function getDetailImage(name: string): StaticImageData {
    switch (name) {
      case "Knight":
        return knightAvatar
      case "Lord":
        return lordAvatar
      case "King":
        return kingAvatar
      default:
        return knightAvatar
    }
  }

  const PageContent = () => {
    return (
      <Flex direction="column" gap={{base: "1rem", xl: "1.5rem", "2xl": "3rem"}}>
        <VStack gap={{base: "0.5rem", "2xl": "1rem"}}>
          <Heading textAlign="center" textStyle={{base: "4xl", md: "5xl", "2xl": "6xl"}} className={styles.goldEffect}>
            Secure your Founder Chest
          </Heading>
          <Text textAlign="center">
            Prepare to immerse yourself in the thrilling world of Otium with our exclusive presale!
            For a limited time you have the chance to purchase three unique tiers of chests, each brimming with
            powerful
            items.
          </Text>
          <TestApiButtons></TestApiButtons>
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
      <VStack hideBelow={"lg"} h="80%" flex="0.7" gap="4px">
        <Image h="100%" aspectRatio={4 / 3} fit="contain" alt="Avatar Image" asChild>
          <NextImage src={getDetailImage(chestType)} alt={chestType}/>
        </Image>
        <Heading size="3xl" className={styles.goldEffect}>{chestType}</Heading>
      </VStack>
    )
  }

  const MintContent = () => {
    const [amount, setAmount] = useState("1")
    return (
      <Flex direction="column" align="flex-start" gap={{base: "1rem"}} flex="1" h="100%">
        <VStack align="flex-start" gap={{base: "0.2rem", "2xl": "1rem"}}>
          <Heading textStyle={{base: "lg", "2xl": "2xl"}}>Select your chest</Heading>
          <HStack gap="2rem">
            <For each={[
              {name: "Knight", image: knight_chest_image},
              {name: "Lord", image: lord_chest_image},
              {name: "King", image: king_chest_image}
            ]}>
              {(item, index) => (
                <ChestTile key={index} name={item.name} image={item.image}/>
              )}
            </For>
          </HStack>
        </VStack>
        <VStack align="flex-start" gap="0.5rem" width={"100%"}>
          <Heading textStyle={{base: "lg", "2xl": "2xl"}}>Referral link</Heading>
          <ReferralLinkClipboard></ReferralLinkClipboard>
        </VStack>
        <VStack align="flex-start" gap="0.5rem">
          <Heading textStyle={{base: "lg", "2xl": "2xl"}}>Chest Reward</Heading>
          <HStack flexWrap="wrap">
            <For
              each={getAttributes(chestType)}>
              {(item, index) => (
                <Tag key={index} variant="outline" rounded="md" size={{base: "md", xl: "lg"}}>
                  <Text fontWeight="medium" paddingX="4" paddingY="2" color="white">{item.name}</Text>
                </Tag>
              )}
            </For>
          </HStack>
        </VStack>

        <VStack align="flex-start" gap="0.5rem">
          <Heading textStyle={{base: "lg", "2xl": "2xl"}}>Amount</Heading>
          <StepperInput color="white" min={1} value={amount} onValueChange={(details: any) => {
            setAmount(details.value)
          }}/>
        </VStack>
        <MintButton
          text={getButtonText(chestType, amount)}
          mintAmount={+amount}
          price={getPrice(chestType, amount)}
          guardList={guards}
          candyMachine={getCandyMachine(chestType)}
          candyGuard={getCandyGuard(chestType)}
          umi={umi}
          ownedTokens={ownedTokens}
          setGuardList={setGuards}
          mintsCreated={mintsCreated}
          setMintsCreated={setMintsCreated}
          setCheckEligibility={setCheckEligibility}
          chestType={chestType}/>
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
               aspectRatio={1}
               alt="Chest Image"
               asChild>
          <NextImage src={props.image} alt="Chest Image"/>
        </Image>
        <Text>
          {props.name}
        </Text>
      </VStack>
    )
  }

  const ReferralLinkClipboard = () => {
    return (
      <ClipboardRoot
        display="flex"
        flexDirection="column"
        alignItems={"center"}
        width={"100%"}
        value={createReferralLink(umi.payer.publicKey)}
      >
        <InputGroup
          width="100%"
          endElement={
            <ClipboardIconButton
              backgroundColor={"rgb(var(--secondary-background-rgb))"}
              _hover={{background: "rgb(var(--tertiary-background-rgb))"}}
              color={"white"}
              me="2"/>
          }
        >
          <ClipboardInput
            paddingStart="0.5rem"
            borderColor={"rgb(var(--tertiary-background-rgb))"}
            _focus={{borderColor: "white"}}
            className={styles.clipboard}
          />
        </InputGroup>
      </ClipboardRoot>
    )
  }

  const [openDialog, setDialogOpen] = useState(false)
  useOpenDialogListener((state) => {
    setDialogOpen(state)
  })

  const DialogView = () => {
    return (
      <DialogRoot
        lazyMount
        open={openDialog}
        onOpenChange={(e) => {
          if (!e.open) {
            setChestType("Knight")
            setDialogOpen(e.open)
          }
        }}
        placement={"center"}
        motionPreset="slide-in-bottom"
        size={"lg"}
      >
        <DialogContent p="1rem" alignItems={"center"} gap={"1rem"} backgroundColor={"rgb(var(--background-rgb))"}>
          <DialogHeader display="flex" flexDirection="column" gap="0.5rem" alignItems={"center"}>
            <Heading textAlign="center" textStyle={{base: "2xl", lg: "4xl"}} className={styles.goldEffect}>
              You obtained a Founder Chest!
            </Heading>
            <Text textAlign={"center"}>
              Thank you for your purchase and good luck claiming the throne!<br/>
              You can find your chest in your wallet.
            </Text>
          </DialogHeader>
          <DialogBody w="90%">
            <Image borderRadius="12px" w="100%" fit="fill" alt="Avatar Image" asChild>
              <NextImage src={referral_image} alt={"Referral link image"}/>
            </Image>
          </DialogBody>
          <DialogFooter width={"70%"}>
            <ReferralLinkClipboard></ReferralLinkClipboard>
          </DialogFooter>
          <DialogCloseTrigger color={"white"} _hover={{background: "rgb(var(--secondary-background-rgb))"}}/>
        </DialogContent>
      </DialogRoot>
    )
  }

  const search = useSearchParams()
  const TestApiButtons = () => {
    return (
      <HStack>
        <Button backgroundColor={"blue"}
                onClick={
                  (async () => {
                    await registerReferralUsage(search, umi.payer.publicKey, chestType, 1)
                  })
                }>
          Test chest api
        </Button>
        <Button backgroundColor={"orange"}
                onClick={
                  (async () => {
                    await registerRaffleTickets(umi.payer.publicKey, 1)
                  })
                }>
          Test raffle api
        </Button>
      </HStack>
    )
  }
  const notStarted = false //(new Date("Dec 10 2024 00:00:00").getTime() > new Date().getTime())
  return (
    <main>
      {(notStarted) ? (
        <Center h={"100%"}>
          <Heading textStyle={"5xl"} className={styles.goldEffect}>The Otium mint will start on december 10</Heading>
        </Center>
      ) : loading ? (<></>) :
        (<div className={styles.content}>
            <PageContent></PageContent>
            <DialogView></DialogView>
            <ToastContainer
              position="bottom-right"
              autoClose={2000}
              hideProgressBar
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
          </div>
        )}
    </main>
  )
}
