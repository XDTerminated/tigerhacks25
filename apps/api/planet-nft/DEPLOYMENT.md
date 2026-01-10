# Planet NFT Anchor Program - Deployment Guide

## Prerequisites

1. **Install Anchor**: https://www.anchor-lang.com/docs/installation
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

2. **Install Solana CLI**: https://docs.solana.com/cli/install-solana-cli-tools

3. **Set up wallet**:
   ```bash
   solana-keygen new
   # Save the path to ~/.config/solana/id.json (or update Anchor.toml)
   ```

4. **Configure devnet**:
   ```bash
   solana config set --url devnet
   solana airdrop 2  # Get some SOL for deployment
   ```

## Build and Deploy

1. **Build the program**:
   ```bash
   cd planet-nft
   anchor build
   ```

2. **Get the Program ID**:
   After building, Anchor generates a keypair. Get the program ID:
   ```bash
   solana address -k target/deploy/planet_nft-keypair.json
   ```

3. **Update Program ID**:
   - Update `programs/planet-nft/src/lib.rs`: `declare_id!("YOUR_PROGRAM_ID");`
   - Update `Anchor.toml`: `planet_nft = "YOUR_PROGRAM_ID"`
   - Update `idl.json`: `"address": "YOUR_PROGRAM_ID"`

4. **Rebuild**:
   ```bash
   anchor build
   ```

5. **Deploy**:
   ```bash
   anchor deploy
   ```

6. **Verify deployment**:
   ```bash
   solana program show YOUR_PROGRAM_ID
   ```

## Generate IDL for Frontend

After successful deployment:

```bash
anchor build
```

The IDL will be at: `target/idl/planet_nft.json`

Copy this file to your frontend project for type-safe Solana program interactions.

## Testing

Run the test suite:

```bash
anchor test
```

Make sure you have:
- Devnet SOL in your wallet
- Node.js dependencies installed (`npm install` or `yarn install`)

## Program Details

- **Program Name**: `planet_nft`
- **Instruction**: `mint_planet_nft(planet_id, planet_name, metadata_uri)`
- **PDA Seeds**: `["planet_nft", planet_id.as_bytes()]`
- **Network**: Devnet
- **Metadata Standard**: Metaplex Token Metadata v3

## Frontend Integration

The frontend will need:
1. The deployed Program ID
2. The IDL file (`target/idl/planet_nft.json`)
3. Anchor client library: `@coral-xyz/anchor`
4. Solana web3.js: `@solana/web3.js`
5. SPL Token: `@solana/spl-token`

Example usage:
```typescript
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Derive PDAs
const [mintPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("planet_nft"), Buffer.from(planetId)],
  programId
);

// Call mint instruction
await program.methods
  .mintPlanetNft(planetId, planetName, metadataUri)
  .accounts({...})
  .rpc();
```

