'use client'
import React, {useEffect, useState} from 'react'
import {useUmi} from "../utils/useUmi"
import {Heading, HStack, Image, Stack, Table, Text, VStack} from "@chakra-ui/react"
import NextImage from "next/image"
import raffle_title_image from 'public/RaffleTitle.png'
import prices from 'public/RafflePrices.png'
import ticket from 'public/RaffleTicket.png'
import buttonImage from 'public/RaffleBuyBotton.png'
import styles from "../styles/Home.module.css"
import 'react-toastify/dist/ReactToastify.css'
import {DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogRoot} from "../components/ui/dialog"
import {toast, ToastContainer} from "react-toastify"
import {publicKey, transactionBuilder, Umi} from "@metaplex-foundation/umi"
import {findAssociatedTokenPda, safeFetchMint, safeFetchToken, transferTokens} from "@metaplex-foundation/mpl-toolbox"
import {Slider} from "../components/ui/slider"

const RETRIEVER_WALLET_ADDRESS = publicKey('D3f77scLAWG2dMBuNQjoeV2A4jVYpQMwTJdEC63df89W') // Notwork receiver wallet address
const SOLANA_NOTWORK_TOKEN = publicKey('GcdLTfPGhdsX6zVjmcLchwwECzYqATHgk64sKZuadHKF') // Notwork token address
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

const handleSendToken = async (umi: Umi, amountToSend: number) => {
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
  return txnBuilder.sendAndConfirm(umi, {send: {skipPreflight: true}})
}

async function registerRaffleTickets(pubAddress: string, tickets: number) {
  const response = await fetch('/api/raffle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: pubAddress,
      tickets: tickets,
      date: Date.now()
    }),
  })
}

async function getLeaderboard(address: string) {
  const response = await fetch('/api/raffle?address=' + address, {
    method: 'GET'
  })
  return await response.json()
}

export default function Raffle() {
  const umi = useUmi()
  const [notworkBalance, setNotworkBalance] = useState<number>(0) // Ensure it's typed as a number
  const [loading, setLoading] = useState<boolean>(false) // Ensure it's typed as a number

  useEffect(() => {
    (async () => {
      if (!umi) return
      setNotworkBalance(await fetchTokenBalance(umi) ?? 0)
    })()
  }, [umi])

  const error = umi.payer.publicKey == "11111111111111111111111111111111" || notworkBalance == 0

  interface BuyButtonProps {
    notworkAmount: number
  }

  async function buyTickets(notworkAmount: number) {
    if (error || loading) return
    setLoading(true)
    toast.loading('Sending Transaction', {
      autoClose: false,
      hideProgressBar: false,
      closeOnClick: false
    })

    await handleSendToken(umi, notworkAmount)
      .then(result => {
        toast.dismiss()
        setLoading(false)
        if (result.result.value.err) {
          toast.error("Transaction failed", {
            closeOnClick: true,
            hideProgressBar: false,
            autoClose: 2000
          })
        } else {
          registerRaffleTickets(umi.payer.publicKey, notworkAmount / 1000)
          setDialogOpen(true)
        }
      }).catch(error => {
        toast.dismiss()
        setLoading(false)
        toast.error("Transaction failed", {
          closeOnClick: true,
          hideProgressBar: false,
          autoClose: 2000
        })
      })
  }

  const BuyButton = (props: BuyButtonProps) => {
    return (
      <VStack gap={"0rem"}>
        <Image
          onClick={async () => {
            setTicketsBought(props.notworkAmount / 1000)
            await buyTickets(props.notworkAmount)
          }}
          w="100%"
          h={{base: "3rem", sm: "6rem", md: "4rem", lg: "6rem"}}
          fit="contain"
          alt="Title Image"
          opacity={error || loading ? "0.6" : "1"}
          asChild
          transition="all .05s ease-in-out"
          _hover={error || loading ? {} : {filter: "drop-shadow(0 0 2.5rem rgb(255, 233, 0, 0.5))"}}
          _active={error || loading ? {} : {transform: "translateY(3px)"}}
        >
          <NextImage src={buttonImage} alt={"Referral link image"}/>
        </Image>
        {
          (error) ? (
            <Text color={"#FF0000"}>{
              (umi.payer.publicKey == "11111111111111111111111111111111") ?
                "Please connect your wallet to enter the raffle" :
                "You need $notwork to enter the raffle!"
            }</Text>) : null
        }
      </VStack>
    )
  }

  interface TicketIndicatorProps {
    tickets: number
  }

  const TicketIndicator = (props: TicketIndicatorProps) => {
    return (
      <HStack alignItems="center">
        <Heading textAlign="center" textStyle={{base: "4xl", lg: "6xl"}}>
          {props.tickets}
        </Heading>
        <Image w={{base: "10rem", md: "5rem", lg: "10rem"}} h={{base: "10rem", md: "5rem", lg: "10rem"}} fit="contain"
               alt="Title Image" asChild>
          <NextImage src={ticket} alt={"Referral link image"}/>
        </Image>
      </HStack>
    )
  }
  const BuySection = () => {
    const [tickets, setTickets] = useState([1])
    const notworkAmount = tickets[0] * 1000
    return (
      <VStack alignItems="center" gap={"2rem"}>
        <VStack alignItems="center" w={"100%"}>
          <TicketIndicator tickets={tickets[0]}/>
          <VStack marginTop={{base: "-2rem", md: "-1rem", lg: "-2rem"}} w={"100%"}>
            <Slider
              min={1}
              width="full"
              variant="outline"
              size="lg"
              value={tickets}
              onValueChange={(e) => setTickets(e.value)}
            />
            <Text>{tickets} Tickets = {notworkAmount} $notwork</Text>
          </VStack>
        </VStack>
        <BuyButton notworkAmount={notworkAmount}></BuyButton>
      </VStack>
    )
  }

  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    (async () => {
      if (!umi || loading) return
      setItems(await getLeaderboard(umi.payer.publicKey))
    })()
  }, [umi, loading, error])

  const LeaderBoard = () => {
    return (
      <VStack w={"100%"} gap={"1rem"} marginBottom={"2rem"}>
        <Heading size={{base: "4xl", md: "5xl"}} className={styles.goldEffect}>Leaderboard</Heading>
        <Table.Root variant={"outline"} size="lg" w={"75%"} className="dark">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Tickets</Table.ColumnHeader>
              <Table.ColumnHeader>Address</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item: any) => (
              <Table.Row key={item.address}>
                <Table.Cell>{item.tickets}</Table.Cell>
                <Table.Cell>{item.address}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </VStack>
    )
  }


  const RotatingTicket = () => {
    function handleMouseMove(ev: React.MouseEvent) {
      const x = ev.clientX
      const y = ev.clientY

      const middleX = window.innerWidth / 2
      const middleY = window.innerHeight / 2

      const offsetX = (x - middleX) / middleX * 200
      const offsetY = (y - middleY) / middleY * 100
      document.documentElement.style.setProperty('--rotateX', (-1 * offsetY).toString() + "deg")
      document.documentElement.style.setProperty('--rotateY', offsetX.toString() + "deg")
    }

    function handleMouseOut(ev: React.MouseEvent) {
      document.documentElement.style.setProperty('--rotateX', "30deg")
      document.documentElement.style.setProperty('--rotateY', "-20deg")
    }

    return (
      <Image
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
        className={styles.flip}
        margin="-4rem 0"
        borderRadius="12px"
        w="100%" h="400px" fit="contain"
        alt="Avatar Image" asChild>
        <NextImage src={ticket} alt={"Referral link image"}/>
      </Image>
    )
  }

  const [ticketsBought, setTicketsBought] = useState(0)
  const [openDialog, setDialogOpen] = useState(false)
  const DialogView = () => {
    return (
      <DialogRoot
        lazyMount
        open={openDialog}
        onOpenChange={(e) => {
          if (!e.open) {
            setDialogOpen(e.open)
          }
        }}
        placement={"center"}
        motionPreset="slide-in-bottom"
        size={"lg"}
      >
        <DialogContent p="1rem" alignItems={"center"} gap={"1rem"} backgroundColor={"rgb(var(--background-rgb))"}>
          <DialogHeader display="flex" flexDirection="column" gap="0.5rem" alignItems={"center"}>
            <Heading
              textAlign="center"
              textStyle={{base: "2xl", lg: "3xl"}}
              className={styles.goldEffect}
            >
              Congratulations you&apos;ve obtained!
            </Heading>
            <Heading textAlign="center" textStyle={{base: "3xl", lg: "4xl"}}>
              {ticketsBought} Tickets
            </Heading>
          </DialogHeader>
          <DialogBody w="90%">
            <RotatingTicket></RotatingTicket>
          </DialogBody>
          <DialogCloseTrigger color={"white"} _hover={{background: "rgb(var(--secondary-background-rgb))"}}/>
        </DialogContent>
      </DialogRoot>
    )
  }

  const CountDown = () => {
    const [counter, setCounter] = React.useState("")

    useEffect(() => {
      let countDownDate = new Date("Dec 14, 2024 00:00:00").getTime()
      let now = new Date().getTime()
      let distance = countDownDate - now
      while (distance < 0) {
        countDownDate += 6.048e+8
        distance = countDownDate - now
      }
      let x = setInterval(function () {
        let now = new Date().getTime()
        let distance = countDownDate - now
        let days = Math.floor(distance / (1000 * 60 * 60 * 24))
        let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)

        setCounter(days + " Days " + hours + " Hours " + minutes + " Minutes " + seconds + " Seconds ")

        if (distance < 0) {
          clearInterval(x)
          countDownDate += 6.048e+8
        }
      }, 1000)
    }, [])

    return (
      <Heading
        textStyle={{base: "lg", xl: "3xl"}}
        marginTop="-2.5rem"
        textAlign={"center"}
        className={styles.goldEffect}
      >
        Raffle ends in {counter}
      </Heading>
    )
  }

  return (
    <div className={styles.content}>
      <VStack>
        <Image marginTop="1rem" h={{base: "8rem", xl: "12rem"}} fit="contain" alt="Title Image" asChild>
          <NextImage src={raffle_title_image} alt={"Referral link image"}/>
        </Image>
        <CountDown></CountDown>
        <VStack w="100%" gap={"4rem"}>
          <Stack direction={{base: "column", md: "row"}} w="80%" alignItems={"center"} gap={"4rem"}>
            <Image w={{base: "80%", md: "60%"}} fit="contain" alt="Title Image" asChild>
              <NextImage src={prices} alt={"Referral link image"}/>
            </Image>
            <BuySection></BuySection>
          </Stack>
          <LeaderBoard></LeaderBoard>
        </VStack>
      </VStack>
      <DialogView></DialogView>
      <ToastContainer
        position="bottom-right"
        hideProgressBar={false}
        newestOnTop={true}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  )
}
