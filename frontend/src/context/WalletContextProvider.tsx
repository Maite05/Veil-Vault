import { FC, ReactNode, ComponentType, useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, BaseSignerWalletAdapter } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// Targets devnet to match Anchor.toml + program deployment.
const NETWORK = WalletAdapterNetwork.Devnet;
const ENDPOINT = clusterApiUrl(NETWORK);

// Cast to avoid React 18 FC type incompatibility with React 19's stricter JSX checker.
const Conn = ConnectionProvider as ComponentType<{ endpoint: string; children: ReactNode }>;
const Wall = WalletProvider as ComponentType<{
  wallets: BaseSignerWalletAdapter[];
  autoConnect: boolean;
  children: ReactNode;
}>;

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
    <Conn endpoint={ENDPOINT}>
      <Wall wallets={wallets} autoConnect>
        {children}
      </Wall>
    </Conn>
  );
};
