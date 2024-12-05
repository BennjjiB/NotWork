import {WalletAdapterNetwork} from "@solana/wallet-adapter-base"
import {WalletProvider} from "@solana/wallet-adapter-react"
import {WalletModalProvider} from "@solana/wallet-adapter-react-ui"
import type {AppProps} from "next/app"
import Head from "next/head"
import React, {useMemo} from "react"
import "../styles/globals.css"
import "@solana/wallet-adapter-react-ui/styles.css"
import {ChakraProvider, defaultSystem} from '@chakra-ui/react'
import {image, headerText} from 'settings'
import {UmiProvider} from "../utils/UmiProvider"
import dynamic from "next/dynamic"

export default function App({Component, pageProps}: AppProps) {
  let endpoint = "https://api.devnet.solana.com"
  if (process.env.NEXT_PUBLIC_RPC) {
    endpoint = process.env.NEXT_PUBLIC_RPC
  }
  const wallets = useMemo(
    () => [],
    []
  )
  const WalletMultiButton = dynamic(() =>
    import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton), {ssr: false}
  )
  return (
    <>
      <Head>
        <meta property="og:type" content="website"/>
        <meta property="og:title" content={headerText}/>
        <meta
          property="og:description"
          content="Join the exclusive Pre-Sale. Start your Otium Adventure with one out of the three limited time offers."
        />
        <meta name="description"
              content="Join the exclusive Pre-Sale. Start your Otium Adventure with one out of the three limited time offers."/>

        <meta
          property="og:image"
          content={image}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>{headerText}</title>
        <link rel="icon" href="/otium.png"/>
      </Head>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <UmiProvider endpoint={endpoint}>
          <WalletModalProvider>
            <ChakraProvider value={defaultSystem}>
              <div className={"wallet"}>
                <WalletMultiButton></WalletMultiButton>
              </div>
              <Component {...pageProps} />
            </ChakraProvider>
          </WalletModalProvider>
        </UmiProvider>
      </WalletProvider>
    </>
  )
}
