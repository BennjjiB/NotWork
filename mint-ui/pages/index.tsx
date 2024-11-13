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
  For, Button
} from '@chakra-ui/react'
import NextImage, {StaticImageData} from 'next/image'
import '@solana/wallet-adapter-react-ui/styles.css'
import knightAvatar from 'public/KnightAvatar.png'
import lordAvatar from 'public/Lord_Avatar.png'
import kingAvatar from 'public/King_Avatar.png'
import knight_chest_image from 'public/Knights_Chest.png'
import lord_chest_image from 'public/Lords_Chest.png'
import king_chest_image from 'public/Kings_Chest.png'
import dynamic from "next/dynamic"
import {toast, ToastContainer} from "react-toastify"
import 'react-toastify/dist/ReactToastify.css'
import {StepperInput} from "../components/ui/stepper-input"
import {useSolanaTime} from "../utils/SolanaTimeContext"
import {GuardReturn} from "../utils/checkerHelper"
import {Tag} from "../components/ui/tag"
import {MintButton} from "../components/mintButton"
import {
  DialogActionTrigger,
  DialogBody, DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from "../components/ui/dialog"
import {createEvent} from "react-event-hook"
import {emitOpenDialog, useOpenDialogListener} from "../utils/events"

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {ssr: false}
)

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
  }, [umi, checkEligibility])
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
  const [amount, setAmount] = useState("1")

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

  function getButtonText(name: string): string {
    switch (name) {
      case "Knight":
        return "Mint for 0.25 Sol"
      case "Lord":
        return "Mint for 0.5 Sol"
      case "King":
        return "Mint for 1 Sol"
      default:
        return ""
    }
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
        <Image h="100%" aspectRatio={4 / 3} fit="contain" alt="Avatar Image" asChild>
          <NextImage src={getDetailImage(chestType)} alt={chestType}/>
        </Image>
        <Heading size="3xl" className={styles.goldEffect}>{chestType}</Heading>
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
                <ChestTile key={index} name={item.name} image={item.image}/>
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
                <Tag key={index} variant="outline" rounded="md" size={{base: "md", xl: "lg"}}>
                  <Text fontWeight="medium" paddingX="4" paddingY="2" color="white">{item.name}</Text>
                </Tag>
              )}
            </For>
          </HStack>
        </VStack>

        <VStack align="flex-start" gap="0.5rem">
          <Heading>Amount</Heading>
          <StepperInput color="white" min={1} value={amount} onValueChange={(details: any) => {
            setAmount(details.value)
          }}/>
        </VStack>
        <Button onClick={() => {
          toast.success("transactions successful!")
          const postData = async (code: string, chestType: string, noOfChests: number) => {
            const response = await fetch('/api/promotion', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code: code,
                chestType: chestType,
                noOfChests: noOfChests
              }),
            })
            const result = await response.json()
            console.log(result)
          }
          postData("Test", chestType, +amount)
        }}>
          Post Test
        </Button>
        <MintButton
          text={getButtonText(chestType)}
          mintAmount={+amount}
          guardList={guards}
          candyMachine={getCandyMachine(chestType)}
          candyGuard={getCandyGuard(chestType)}
          umi={umi}
          ownedTokens={ownedTokens}
          setGuardList={setGuards}
          mintsCreated={mintsCreated}
          setMintsCreated={setMintsCreated}
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

  const [openDialog, setDialogOpen] = useState(false)
  useOpenDialogListener((state) => {
    setDialogOpen(state)
  })

  const DialogView = () => {
    return (
      <DialogRoot
        lazyMount open={openDialog}
        onOpenChange={(e) => setDialogOpen(e.open)}
        placement={"center"}
        motionPreset="slide-in-bottom"
      >
        <DialogContent alignItems={"center"} backgroundColor={"rgb(var(--background-rgb))"}>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button>Save</Button>
          </DialogFooter>
          <DialogCloseTrigger/>
        </DialogContent>
      </DialogRoot>
    )
  }

  return (
    <main>
      <div className={styles.wallet}>
        <WalletMultiButtonDynamic></WalletMultiButtonDynamic>
      </div>
      {loading ? (<></>) : (
        <div className={styles.content}>
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
