import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PlanetNft } from "../target/types/planet_nft";
import { PublicKey, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { expect } from "chai";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

describe("planet-nft", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PlanetNft as Program<PlanetNft>;
  const payer = provider.wallet;

  it("Mints a planet NFT", async () => {
    const planetId = "test_planet_123";
    const planetName = "Test Planet";
    const metadataUri = "https://placeholder.metadata/test_planet_123";

    // Derive PDAs
    const [mintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("planet_nft"), Buffer.from(planetId)],
      program.programId
    );

    const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority"), Buffer.from(planetId)],
      program.programId
    );

    const tokenAccount = await getAssociatedTokenAddress(
      mintPda,
      payer.publicKey
    );

    // Derive metadata PDA
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mintPda.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    try {
      const tx = await program.methods
        .mintPlanetNft(planetId, planetName, metadataUri)
        .accounts({
          mint: mintPda,
          mintAuthority: mintAuthorityPda,
          tokenAccount: tokenAccount,
          metadata: metadataPda,
          tokenMetadataProgram: METADATA_PROGRAM_ID,
          payer: payer.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Transaction signature:", tx);
      console.log("Mint PDA:", mintPda.toString());
    } catch (err) {
      console.error("Error:", err);
      throw err;
    }
  });
});
