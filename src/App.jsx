import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Coins,
  TrendingUp,
  Layers,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronRight,
  RefreshCw,
  FileText,
  X,
  BookOpen,
  Cpu,
  Shield,
  Users,
} from "lucide-react";

// ============================================================================
// MAINNET CONTRACT & SOCIAL CONFIGURATION (BNB SMART CHAIN - CHAIN ID: 56)
// ============================================================================
const TOKEN_ADDRESS = "0x7eb5Bebb619a5a13c420e99d395CC437d389a544";
const PRESALE_ADDRESS = "0x346934429A93EE18dea648562CF8a7e9407DBb47";
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// Ganti tautan di bawah ini dengan link saluran resmi AURA Protocol Anda
const SOCIAL_LINKS = {
  telegram: "https://t.me/AuraProtocolOfficial",
  twitter: "https://x.com/AuraProtocol",
  discord: "https://discord.gg/auraprotocol",
};

const PRESALE_CAPS = {
  softCapUsd: 150000, // $150,000 Soft Cap
  hardCapUsd: 420000, // $420,000 Hard Cap (Total 60M $AUR across 5 stages)
};

const BSC_FALLBACK_RPCS = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.defibit.io/",
  "https://bsc.publicnode.com",
];
const BSC_CHAIN_ID_HEX = "0x38"; // 56 in decimal
const LISTING_PRICE = 0.0125;

// Verified BscScan ABI Function Selectors
const SELECTORS = {
  buyWithBNB: "0x20f1fc61",
  approve: "0x095ea7b3",
  buyWithUSDT: "0x706c5957",
  claimTokens: "0x48c54b9d",
  balanceOf: "0x70a08231",
  currentStep: "0x5bc34f71",
  totalTokensSold: "0x518ab2a8",
  vestingSchedules: "0x8129bbcd",
  getClaimableAmount: "0x4831d994",
  getLatestBnbPrice: "0xd15d7453",
};

const PRESALE_STAGES = [
  { stage: 1, name: "Seed Stage", price: 0.0045, bonus: "10%", allocation: "15,000,000" },
  { stage: 2, name: "Private Round", price: 0.006, bonus: "7%", allocation: "15,000,000" },
  { stage: 3, name: "Public Tier 1", price: 0.0075, bonus: "5%", allocation: "12,000,000" },
  { stage: 4, name: "Public Tier 2", price: 0.009, bonus: "2%", allocation: "10,000,000" },
  { stage: 5, name: "Final Stage", price: 0.0105, bonus: "0%", allocation: "8,000,000" },
];

const TOKENOMICS = [
  { label: "Public & Private Presale", percent: 60, amount: "60,000,000 AUR", color: "bg-cyan-400" },
  { label: "DEX & CEX Liquidity Pool", percent: 20, amount: "20,000,000 AUR", color: "bg-blue-500" },
  { label: "Ecosystem & Staking Rewards", percent: 10, amount: "10,000,000 AUR", color: "bg-indigo-500" },
  { label: "Team & Advisors (12m Lock)", percent: 5, amount: "5,000,000 AUR", color: "bg-purple-500" },
  { label: "Marketing & Strategic Growth", percent: 5, amount: "5,000,000 AUR", color: "bg-emerald-400" },
];

const ROADMAP = [
  {
    phase: "Phase 01",
    title: "Foundation & Smart Contracts",
    status: "Completed",
    items: [
      "$AUR BEP-20 Token Deployment & BscScan Verification",
      "5-Stage Presale & Linear Vesting Contract Audit",
      "Chainlink Oracle Real-Time BNB/USD Feed Integration",
    ],
  },
  {
    phase: "Phase 02",
    title: "Multi-Stage Presale Launch",
    status: "Active Now",
    items: [
      "Stage 1–5 Public Presale Live on BSC Mainnet",
      "Global Community Expansion & KOL Partnerships",
      "Real-Time On-Chain Vesting Dashboard Release",
    ],
  },
  {
    phase: "Phase 03",
    title: "TGE & PancakeSwap Listing",
    status: "Upcoming",
    items: [
      "Token Generation Event (20% Initial Unlock)",
      "PancakeSwap V3 Liquidity Lock ($0.0125 Listing)",
      "CoinMarketCap & CoinGecko Fast-Track Listing",
    ],
  },
  {
    phase: "Phase 04",
    title: "AI DeFi Yield Protocol",
    status: "Upcoming",
    items: [
      "AURA Automated Cross-Chain Yield Vaults",
      "Governance DAO & $AUR Staking Pools",
      "Tier-1 Centralized Exchange (CEX) Listings",
    ],
  },
];

const WHITEPAPER_SECTIONS = [
  {
    id: "01",
    title: "Executive Summary & Vision",
    icon: BookOpen,
    content:
      "AURA Protocol ($AUR) is a decentralized AI-driven liquidity and yield optimization infrastructure built natively on BNB Smart Chain (BSC). By combining autonomous smart contract execution with real-time Chainlink decentralized oracle feeds, AURA eliminates manual portfolio rebalancing inefficiencies and delivers institutional-grade yield strategies to retail and DeFi participants.",
  },
  {
    id: "02",
    title: "Autonomous AI-DeFi Yield Engine",
    icon: Cpu,
    content:
      "The core AURA Vault architecture continuously monitors liquidity depth, slippage metrics, and funding rates across PancakeSwap V3 and top BSC money markets. Automated execution keepers dynamically route capital into highest-risk-adjusted yield pools while maintaining strict non-custodial user ownership.",
  },
  {
    id: "03",
    title: "Tokenomics & Presale Economics",
    icon: Coins,
    content:
      "$AUR has a strictly capped maximum supply of 100,000,000 tokens (BEP-20 standard, non-mintable). 60\% (60,000,000$AUR) is allocated across 5 progressive presale stages starting at $0.0045 (Seed Stage) up to $0.0105 (Final Stage), targeting a Soft Cap of $150,000 and Hard Cap of $420,000 prior to public DEX listing at $0.0125.",
  },
  {
    id: "04",
    title: "On-Chain Vesting & Security Architecture",
    icon: Shield,
    content:
      "All presale allocations are governed directly by our verified BSC Mainnet smart contract (0x346934429A93EE18dea648562CF8a7e9407DBb47). Buyers receive 20% unlock at Token Generation Event (TGE) followed by a 30-day cliff and linear block-by-block vesting, preventing post-listing sell pressure and ensuring long-term liquidity stability.",
  },
];

// ============================================================================
// CUSTOM AURA LOGO & SOCIAL ICONS COMPONENTS
// ============================================================================
function AuraLogoMark({ className = "w-10 h-10" }) {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/aura-logo.png"
        alt="AURA Protocol ($AUR) Logo"
        onError={() => setImgError(true)}
        className={`${className} object-contain rounded-xl bg-black p-1 border border-cyan-500/40 shadow-lg shadow-cyan-500/20`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-xl bg-black border border-cyan-500/40 p-1.5 flex items-center justify-center shadow-lg shadow-cyan-500/20`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="auraGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="auraGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <path d="M48 14 L86 84 L70 84 L48 40 Z" fill="url(#auraGradRight)" />
        <path d="M52 14 L14 84 L30 84 L52 38 Z" fill="url(#auraGradLeft)" />
        <path
          d="M16 82 Q52 44 92 47 Q64 56 16 82 Z"
          fill="url(#auraGradLeft)"
        />
      </svg>
    </div>
  );
}

function TelegramIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function TwitterXIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

// ============================================================================
// UTILITY HELPERS (ES2015 COMPATIBLE)
// ============================================================================
function getInjectedProvider() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
    const mm = window.ethereum.providers.find((p) => p.isMetaMask);
    if (mm) return mm;
    return window.ethereum.providers[0];
  }
  return window.ethereum;
}

function toHex32(decimalString, decimals) {
  const normalized = String(decimalString || "0").replace(",", ".");
  const parts = normalized.split(".");
  const whole = parts[0].replace(/\D/g, "") || "0";
  const frac = (parts[1] || "").replace(/\D/g, "").padEnd(decimals, "0").slice(0, decimals);
  let factor = BigInt(1);
  const ten = BigInt(10);
  for (let i = 0; i < decimals; i++) {
    factor = factor * ten;
  }
  const value = BigInt(whole) * factor + BigInt(frac || "0");
  return value.toString(16).padStart(64, "0");
}

function padAddress(address) {
  return address.to