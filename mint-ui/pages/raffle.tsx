'use client'
import React, {useState, useEffect} from 'react'
import {useUmi} from "../utils/useUmi"
import {amountToNumber} from "@metaplex-foundation/umi"
import {Heading, HStack, Image, Text, VStack} from "@chakra-ui/react"
import {fetchSolBalance, fetchTokenBalance} from "../utils/transactions"
import NextImage from "next/image"
import raffle_title_image from 'public/RaffleTitle.png'
import prices from 'public/RafflePrices.png'
import ticket from 'public/RaffleTicket.png'
import buttonImage from 'public/RaffleBuyBotton.png'
import {Slider} from "../components/ui/slider"
import {Table} from "@chakra-ui/react"


export default function Raffle() {
  const umi = useUmi()
  const [solBalance, setSolBalance] = useState(0) // State for Sol balance
  const [notworkBalance, setNotworkBalance] = useState<number>(0) // Ensure it's typed as a number

  useEffect(() => {
    (async () => {
      if (!umi) return
      const solAmount = await fetchSolBalance(umi)
      if (solAmount) {
        setSolBalance(amountToNumber(solAmount))
      }

      setNotworkBalance(await fetchTokenBalance(umi) ?? 0)
    })()
  }, [umi])

  const BuyButton = () => {
    return (
      <VStack>
        <Image
          onClick={
            () => (async () => {
              console.log("Sending")
              //await handleSendToken(umi, "1000")
            })()
          }
          w="100%"
          h={"6rem"}
          fit="contain"
          alt="Title Image"
          asChild
          _active={{transform: "translateY(3px)"}}
        >
          <NextImage src={buttonImage} alt={"Referral link image"}/>
        </Image>
        {
          true ? (<Text color={"#FF0000"}>{"Text"}</Text>) : null
        }
      </VStack>
    )
  }

  function getNotworkAmount(tickets: number): number {
    return tickets * 1000
  }

  const [counter, setCounter] = React.useState("")

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

  const BuySection = () => {
    const [amountToSend, setAmountToSend] = useState([1])
    return (
      <VStack alignItems="center" gap={"2rem"}>
        <VStack alignItems="center" w={"100%"} gap={"0.3rem"}>
          <HStack alignItems="center">
            <Heading textAlign="center" textStyle={{base: "4xl", lg: "6xl"}}>
              {amountToSend}
            </Heading>
            <Image w="10rem" h="10rem" fit="contain" alt="Title Image" asChild>
              <NextImage src={ticket} alt={"Referral link image"}/>
            </Image>
          </HStack>
          <Slider
            width="full"
            variant="outline"
            size="lg"
            value={amountToSend}
            onValueChange={(e) => setAmountToSend(e.value)}
          />
          <Text>{amountToSend} Tickets = {getNotworkAmount(amountToSend[0])} $notwork</Text>
        </VStack>
        <BuyButton></BuyButton>
      </VStack>
    )
  }

  const items = [
    {id: 1, name: "Laptop", category: "Electronics", price: 999.99},
    {id: 2, name: "Coffee Maker", category: "Home Appliances", price: 49.99},
    {id: 3, name: "Desk Chair", category: "Furniture", price: 150.0},
    {id: 4, name: "Smartphone", category: "Electronics", price: 799.99},
    {id: 5, name: "Headphones", category: "Accessories", price: 199.99},
  ]

  const LeaderBoard = () => {
    return (
      <Table.Root size="sm" interactive>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Product</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Price</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell>{item.name}</Table.Cell>
              <Table.Cell>{item.category}</Table.Cell>
              <Table.Cell textAlign="end">{item.price}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    )
  }


  return (
    <VStack>
      <Image h="12rem" fit="contain" alt="Title Image" asChild>
        <NextImage src={raffle_title_image} alt={"Referral link image"}/>
      </Image>
      <Heading>{counter}</Heading>
      <HStack alignItems={"center"} gap={"4rem"}>
        <Image w="60%" fit="contain" alt="Title Image" asChild>
          <NextImage src={prices} alt={"Referral link image"}/>
        </Image>
        <BuySection></BuySection>
      </HStack>
      <LeaderBoard></LeaderBoard>
    </VStack>
  )
}
