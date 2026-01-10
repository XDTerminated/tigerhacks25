/**
 * Wallet Context
 * Provides Solana wallet integration and NFT minting functionality
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl } from "@solana/web3.js";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { solanaService } from "../services/solana";
import { getUnmintedNFTs, updateMintInfo } from "../services/api";
import type { Wallet as AnchorWallet } from "@coral-xyz/anchor";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

const network = WalletAdapterNetwork.Devnet;
const endpoint = clusterApiUrl(network);
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

interface WalletContextType {
    isConnected: boolean;
    walletAddress: string | null;
    isLoading: boolean;
    mintEarnedNFTs: () => Promise<void>;
    error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

/**
 * Inner component that uses wallet hooks
 */
function WalletContextInner({ children }: { children: ReactNode }) {
    const { publicKey, wallet, connecting } = useWallet();
    const { user } = useAuth0();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isConnected = !!publicKey;
    const walletAddress = publicKey?.toBase58() || null;

    /**
     * Mint all earned but unminted NFTs
     */
    const mintEarnedNFTs = useCallback(async () => {
        if (!isConnected || !user?.email || !wallet || !publicKey) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Get unminted NFTs from backend
            const unmintedNFTs = await getUnmintedNFTs(user.email);

            if (unmintedNFTs.length === 0) {
                setIsLoading(false);
                return;
            }

            // Create Anchor wallet adapter - using type assertion to match Anchor's Wallet interface
            const anchorWallet = {
                publicKey: publicKey,
                signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
                    if (wallet.adapter && "signTransaction" in wallet.adapter) {
                        return await wallet.adapter.signTransaction(tx);
                    }
                    throw new Error("Wallet does not support signTransaction");
                },
                signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
                    if (wallet.adapter && "signAllTransactions" in wallet.adapter) {
                        return await wallet.adapter.signAllTransactions(txs);
                    }
                    throw new Error("Wallet does not support signAllTransactions");
                },
            } as AnchorWallet;

            // Mint each NFT
            for (const nft of unmintedNFTs) {
                try {
                    // Prepare metadata
                    const metadata = {
                        planet_id: nft.planet_id,
                        planet_name: nft.planet_name,
                        earned_date: nft.earned_date,
                    };

                    // Mint NFT
                    const result = await solanaService.mintPlanetNFT(anchorWallet, nft.planet_id, nft.planet_name, metadata);

                    // Update backend with mint info
                    await updateMintInfo(nft.id, result.tokenId, result.signature, result.metadataUri);
                } catch (error) {
                    console.error(`Failed to mint NFT ${nft.id}:`, error);
                    // Continue with next NFT instead of failing completely
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Error minting earned NFTs:", errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, user?.email, wallet, publicKey]);

    // Auto-mint when wallet connects (once), then check every minute
    useEffect(() => {
        if (!isConnected || !user?.email) {
            return;
        }

        let isMounted = true;
        let initialTimer: NodeJS.Timeout | null = null;
        let intervalTimer: NodeJS.Timeout | null = null;

        const checkAndMint = async () => {
            if (!isMounted) return;
            try {
                await mintEarnedNFTs();
            } catch {
                // Silently handle errors in periodic check
            }
        };

        // Initial check after wallet connects (with small delay)
        initialTimer = setTimeout(() => {
            if (isMounted) {
                checkAndMint();
            }
        }, 2000);

        // Then check every minute (60000ms)
        intervalTimer = setInterval(() => {
            if (isMounted) {
                checkAndMint();
            }
        }, 60000);

        return () => {
            isMounted = false;
            if (initialTimer) clearTimeout(initialTimer);
            if (intervalTimer) clearInterval(intervalTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, user?.email]); // Only depend on connection state, not functions

    return (
        <WalletContext.Provider
            value={{
                isConnected,
                walletAddress,
                isLoading: isLoading || connecting,
                mintEarnedNFTs,
                error,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

/**
 * Wallet Provider Component
 * Wraps the app with Solana wallet providers
 */
export function WalletContextProvider({ children }: { children: ReactNode }) {
    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletContextInner>{children}</WalletContextInner>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

/**
 * Hook to use wallet context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useWalletContext() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWalletContext must be used within WalletContextProvider");
    }
    return context;
}

/**
 * Wallet Connect Button Component
 * Re-export for convenience
 */
export { WalletMultiButton };
