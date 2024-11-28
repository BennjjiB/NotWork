'use client'
import React, {useState, useEffect} from 'react'
import {useUmi} from "../utils/useUmi"
import {amountToNumber} from "@metaplex-foundation/umi"
import {Heading, HStack, Image, Stack, Text, VStack} from "@chakra-ui/react"
import {fetchSolBalance, fetchTokenBalance} from "../utils/transactions"
import NextImage, {StaticImageData} from "next/image"
import raffle_title_image from 'public/RaffleTitle.png'
import prices from 'public/RafflePrices.png'
import ticket from 'public/RaffleTicket.png'
import buttonImage from 'public/RaffleBuyBotton.png'
import {Slider} from "../components/ui/slider"
import {Table} from "@chakra-ui/react"
import styles from "../styles/Home.module.css"
import {useOpenDialogListener} from "../utils/events"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot
} from "../components/ui/dialog"
import referral_image from "../public/referral_image.png"

export default function Raffle() {
  const umi = useUmi()
  const [notworkBalance, setNotworkBalance] = useState<number>(0) // Ensure it's typed as a number

  useEffect(() => {
    (async () => {
      if (!umi) return
      setNotworkBalance(await fetchTokenBalance(umi) ?? 0)
    })()
  }, [umi])

  const error = umi.payer.publicKey == "11111111111111111111111111111111" || notworkBalance == 0
  const BuyButton = () => {
    return (
      <VStack gap={"0rem"}>
        <Image
          onClick={
            () => (async () => {
              console.log("Sending")
              //await handleSendToken(umi, "1000")
            })()
          }
          w="100%"
          h={{base: "3rem", sm: "6rem", md: "4rem", lg: "6rem"}}
          fit="contain"
          alt="Title Image"
          opacity={error ? "0.6" : "1"}
          asChild
          transition="all .05s ease-in-out"
          _hover={error ? {} : {filter: "drop-shadow(0 0 2.5rem rgb(255, 233, 0, 0.5))"}}
          _active={error ? {} : {transform: "translateY(3px)"}}
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

  const [counter, setCounter] = React.useState("")

  /*
  useEffect(() => {
    let countDownDate = new Date("Jan 5, 2030 15:37:25").getTime()

    let x = setInterval(function () {
      let now = new Date().getTime()
      let distance = countDownDate - now
      let days = Math.floor(distance / (1000 * 60 * 60 * 24))
      let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      let seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setCounter(days + "d " + hours + "h " + minutes + "m " + seconds + "s ")

      if (distance < 0) {
        clearInterval(x)
        setCounter("Finished")
      }
    }, 1000)
  }, [])
*/

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
              width="full"
              variant="outline"
              size="lg"
              value={tickets}
              onValueChange={(e) => setTickets(e.value)}
            />
            <Text>{tickets} Tickets = {notworkAmount} $notwork</Text>
          </VStack>
        </VStack>
        <BuyButton></BuyButton>
      </VStack>
    )
  }

  const items = [
    {id: 1, tickets: "Laptop", address: "Electronics"},
    {id: 2, tickets: "Coffee Maker", address: "Home Appliances"},
    {id: 3, tickets: "Desk Chair", address: "Furniture"},
  ]

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
            {items.map((item) => (
              <Table.Row key={item.id}>
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
    const [MousePosition, setMousePosition] = useState({
      left: 0,
      top: 0
    })

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

  const [openDialog, setDialogOpen] = useState(true)
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
            <Heading textAlign="center" textStyle={{base: "2xl", lg: "3xl"}}
                     className={styles.goldEffect}>
              Congratulations you've obtained!
            </Heading>
            <Heading textAlign="center" textStyle={{base: "3xl", lg: "4xl"}}>
              50 Tickets
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

  return (
    <div>
      <VStack>
        <Image marginTop="1rem" h={{base: "8rem", xl: "12rem"}} fit="contain" alt="Title Image" asChild>
          <NextImage src={raffle_title_image} alt={"Referral link image"}/>
        </Image>
        <Heading
          textStyle={{base: "lg", xl: "3xl"}}
          marginTop="-2.5rem"
          textAlign={"center"}
          className={styles.goldEffect}
        >
          Raffle ends in {new Date().toString()}
        </Heading>
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
    </div>
  )
}
