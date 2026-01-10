import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer'],
      globals: {
        Buffer: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Solana libraries (largest dependencies)
          'solana-core': ['@solana/web3.js'],
          'solana-wallet': [
            '@solana/wallet-adapter-base',
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-react-ui',
            '@solana/wallet-adapter-phantom',
            '@solana/wallet-adapter-solflare',
          ],
          'solana-anchor': ['@coral-xyz/anchor', '@solana/spl-token'],
          // Split other large libraries
          'ai-services': ['@google/generative-ai', '@elevenlabs/elevenlabs-js'],
          // React core
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
