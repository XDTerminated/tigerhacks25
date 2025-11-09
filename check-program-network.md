# How to Check Solana Program Network

## Quick Check

Your program ID: `Fb7uNXapsRwUdsvGDedesLS7D1A4AHk6CeMvrrvTVqwf`

### Option 1: Solscan (Easiest)
1. Go to: https://solscan.io/account/Fb7uNXapsRwUdsvGDedesLS7D1A4AHk6CeMvrrvTVqwf
2. Check the URL - if it says `?cluster=devnet` → DevNet
3. If no cluster parameter or `?cluster=mainnet` → Mainnet

### Option 2: Solana Explorer
1. DevNet: https://explorer.solana.com/address/Fb7uNXapsRwUdsvGDedesLS7D1A4AHk6CeMvrrvTVqwf?cluster=devnet
2. Mainnet: https://explorer.solana.com/address/Fb7uNXapsRwUdsvGDedesLS7D1A4AHk6CeMvrrvTVqwf?cluster=mainnet
3. See which one shows your program

### Option 3: Command Line
```bash
# Check on DevNet
solana account Fb7uNXapsRwUdsvGDedesLS7D1A4AHk6CeMvrrvTVqwf --url devnet

# Check on Mainnet
solana account Fb7uNXapsRwUdsvGDedesLS7D1A4AHk6CeMvrrvTVqwf --url mainnet-beta
```

## Current Configuration

Your frontend is configured for **DevNet**:
- RPC: `https://api.devnet.solana.com`
- Network: `WalletAdapterNetwork.Devnet`

## To Switch to Mainnet

If you want to use Mainnet (NOT recommended for testing):
1. Change `SOLANA_NETWORK` to `'mainnet-beta'`
2. Change `RPC_ENDPOINT` to `'https://api.mainnet-beta.solana.com'`
3. Change `network` to `WalletAdapterNetwork.Mainnet`
4. Deploy your Anchor program to Mainnet
5. Update `PROGRAM_ID` if it's different on Mainnet

**⚠️ Warning**: Mainnet uses real SOL. Only use for production!

