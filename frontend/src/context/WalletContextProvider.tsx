import React, { FC, ReactNode, useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// Targets devnet to match Anchor.toml + program deployment.
const NETWORK = WalletAdapterNetwork.Devnet;
const ENDPOINT = clusterApiUrl(NETWORK);

interface Props { children: ReactNode }

export const WalletContextProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: NETWORK }),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
