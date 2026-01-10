/**
 * Type definitions for Solana/Anchor services
 */

import type { PublicKey } from "@solana/web3.js";

// IDL Seed types
export interface IdlSeedConst {
  kind: "const";
  value: number[];
}

export interface IdlSeedArg {
  kind: "arg";
  path: string;
}

export interface IdlSeedAccount {
  kind: "account";
  path: string;
}

export type IdlSeed = IdlSeedConst | IdlSeedArg | IdlSeedAccount;

// IDL PDA definition
export interface IdlPda {
  seeds: IdlSeed[];
  programId?: string;
}

// IDL Account definition
export interface IdlAccountDef {
  name: string;
  isMut?: boolean;
  isSigner?: boolean;
  pda?: IdlPda;
}

// IDL Instruction argument
export interface IdlArg {
  name: string;
  type: string | { defined: string } | { vec: string } | { option: string };
}

// IDL Instruction definition
export interface IdlInstructionDef {
  name: string;
  accounts: IdlAccountDef[];
  args?: IdlArg[];
}

// Note: We use type guards instead of ExtendedIdl to avoid Idl type incompatibilities

// Account details for logging
export interface AccountDetails {
  name: string;
  isMut?: boolean;
  isSigner?: boolean;
  pda?: {
    seeds: IdlSeed[];
    programId?: string;
  };
}

// Seed detail for logging
export interface SeedDetail {
  kind: string;
  raw: IdlSeed;
  type?: string;
  value?: number[];
  path?: string;
}

// PDA account info for logging
export interface PdaAccountInfo {
  name: string;
  seeds?: SeedDetail[];
  fullPda?: IdlPda;
  programId?: string;
  pda?: IdlPda;
}

// Accounts object for Anchor method calls - uses Record for compatibility with Anchor's .accounts() method
export type MintAccounts = Record<string, PublicKey>;

// RPC Error type
export interface RpcError extends Error {
  message: string;
  logs?: string[];
}

// Demo Error type
export interface DemoError extends Error {
  message: string;
}

// General Solana Error type
export interface SolanaError extends Error {
  message: string;
  logs?: string[];
}
