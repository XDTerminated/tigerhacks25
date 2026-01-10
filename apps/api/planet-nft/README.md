# Planet NFT Anchor Program

Solana Anchor program for minting planet NFTs using Metaplex Token Metadata standard.

## Setup

1. Install Anchor: https://www.anchor-lang.com/docs/installation

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Build the program:
```bash
anchor build
```

4. Deploy to devnet:
```bash
anchor deploy
```

After deployment, update the program ID in:
- `programs/planet-nft/src/lib.rs` (declare_id!)
- `Anchor.toml` ([programs.devnet])
- `idl.json` (metadata.address)

## Program Features

- Mints unique NFTs per `planet_id` using PDAs
- Uses Metaplex Token Metadata standard
- Each NFT has:
  - Unique mint address derived from `planet_id`
  - Metadata URI (IPFS/Arweave)
  - Planet name
  - Supply of 1 (NFT standard)

## Usage

The program exposes one instruction:
- `mint_planet_nft(planet_id, planet_name, metadata_uri)`

PDA seeds: `["planet_nft", planet_id.as_bytes()]`

## Testing

```bash
anchor test
```

## Program ID

After deployment, the program ID will be displayed. Update it in all configuration files.

