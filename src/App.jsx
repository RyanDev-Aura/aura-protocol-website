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
} from "lucide-react";

// ============================================================================
// MAINNET CONTRACT CONFIGURATION (BNB SMART CHAIN - CHAIN ID: 56)
// ============================================================================
const TOKEN_ADDRESS = "0x7eb5Bebb619a5a13c420e99d395CC437d389a544";
const PRESALE_ADDRESS = "0x346934429A93EE18dea648562CF8a7e9407DBb47";
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const BSC_FALLBACK_RPCS = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.defibit.io/",
  "https://bsc.publicnode.com",
];
const BSC_CHAIN_ID_HEX = "0x38"; // 56 in decimal
const LISTING_PRICE = 0.0125;

// Verified BscScan ABI Function Selectors
const SELECTORS = {
  // Write Functions
  buyWithBNB: "0x20f1fc61",         // buyWithBNB() -> Verified from BscScan Input Data!
  approve: "0x095ea7b3",            // approve(address,uint256)
  buyWithUSDT: "0xa7c60160",        // buyWithUSDT(uint256)
  claimTokens: "0x48c54b9d",        // claimTokens()
  // Read Functions (eth_call)
  balanceOf: "0x70a08231",          // balanceOf(address)
  currentStep: "0x5bc34f71",        // currentStep()
  totalTokensSold: "0x518ab2a8",    // totalTokensSold()
  vestingSchedules: "0x8129bbcd",   // vestingSchedules(address)
  getClaimableAmount: "0x4831d994", // getClaimableAmount(address)
  getLatestBnbPrice: "0xd15d7453",  // getLatestBnbPrice()
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
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

function fromWeiHex(hexStr, decimals = 18) {
  if (!hexStr || hexStr === "0x") return 0;
  try {
    const val = BigInt(hexStr);
    let divisor = BigInt(1);
    const ten = BigInt(10);
    for (let i = 0; i < decimals; i++) {
      divisor = divisor * ten;
    }
    const whole = Number(val / divisor);
    const rem = Number((val % divisor) / BigInt(Math.pow(10, Math.max(0, decimals - 6))));
    return whole + rem / 1000000;
  } catch {
    return 0;
  }
}

async function rpcCall(method, params) {
  const provider = getInjectedProvider();
  if (provider) {
    try {
      const currentChain = await provider.request({ method: "eth_chainId" });
      if (currentChain === BSC_CHAIN_ID_HEX || parseInt(currentChain, 16) === 56) {
        const res = await provider.request({ method, params });
        if (res !== undefined && res !== null) return res;
      }
    } catch (walletErr) {
      console.warn("Wallet RPC fallback:", walletErr);
    }
  }

  for (const url of BSC_FALLBACK_RPCS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = await response.json();
      if (!json.error && json.result !== undefined) return json.result;
    } catch {
      // Try next fallback RPC
    }
  }
  return "0x0";
}

async function waitForReceipt(txHash, maxAttempts = 25) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]);
    if (receipt && receipt.blockNumber) {
      if (receipt.status === "0x1") return receipt;
      throw new Error("Transaction reverted on BSC Mainnet.");
    }
  }
  throw new Error("Transaction confirmation timed out. Please verify hash on BscScan.");
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Balances & On-Chain Presale State
  const [bnbBalance, setBnbBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [bnbPriceUsd, setBnbPriceUsd] = useState(664.0);
  const [activeStage, setActiveStage] = useState(1);
  const [tokensSold, setTokensSold] = useState(0);
  const [userTotalPurchased, setUserTotalPurchased] = useState(0);
  const [userClaimableNow, setUserClaimableNow] = useState(0);
  const [isSyncingChain, setIsSyncingChain] = useState(false);

  // Purchase Widget State
  const [payToken, setPayToken] = useState("BNB");
  const [payAmount, setPayAmount] = useState("0.001");
  const [txStatus, setTxStatus] = useState("idle");
  const [txMessage, setTxMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copiedAddress, setCopiedAddress] = useState("");

  const currentStageData = PRESALE_STAGES[Math.min(Math.max(activeStage - 1, 0), 4)];
  const bonusPercent = parseFloat(currentStageData.bonus) || 0;

  const normalizedInput = String(payAmount || "0").replace(",", ".");
  const parsedAmount = parseFloat(normalizedInput) || 0;
  const usdEquivalent = payToken === "BNB" ? parsedAmount * bnbPriceUsd : parsedAmount;
  const baseTokens = usdEquivalent / currentStageData.price;
  const bonusTokens = baseTokens * (bonusPercent / 100);
  const totalTokensToReceive = baseTokens + bonusTokens;

  // Fetch global & user on-chain data from BSC Mainnet
  const syncOnChainData = useCallback(async (userAddr) => {
    setIsSyncingChain(true);
    try {
      const priceHex = await rpcCall("eth_call", [
        { to: PRESALE_ADDRESS, data: SELECTORS.getLatestBnbPrice },
        "latest",
      ]);
      const chainBnbPrice = fromWeiHex(priceHex, 8);
      if (chainBnbPrice > 50) setBnbPriceUsd(chainBnbPrice);

      const stepHex = await rpcCall("eth_call", [
        { to: PRESALE_ADDRESS, data: SELECTORS.currentStep },
        "latest",
      ]);
      if (stepHex && stepHex !== "0x" && stepHex !== "0x0") {
        const stepNum = Number(BigInt(stepHex));
        if (stepNum >= 1 && stepNum <= 5) setActiveStage(stepNum);
      }

      const soldHex = await rpcCall("eth_call", [
        { to: PRESALE_ADDRESS, data: SELECTORS.totalTokensSold },
        "latest",
      ]);
      setTokensSold(fromWeiHex(soldHex, 18));

      if (userAddr) {
        const paddedAddr = padAddress(userAddr);
        const provider = getInjectedProvider();

        let bnbBalHex = "0x0";
        if (provider) {
          try {
            bnbBalHex = await provider.request({
              method: "eth_getBalance",
              params: [userAddr, "latest"],
            });
          } catch {
            bnbBalHex = await rpcCall("eth_getBalance", [userAddr, "latest"]);
          }
        } else {
          bnbBalHex = await rpcCall("eth_getBalance", [userAddr, "latest"]);
        }
        setBnbBalance(fromWeiHex(bnbBalHex, 18));

        const [usdtBalHex, vestingHex, claimableHex] = await Promise.all([
          rpcCall("eth_call", [{ to: USDT_ADDRESS, data: SELECTORS.balanceOf + paddedAddr }, "latest"]),
          rpcCall("eth_call", [{ to: PRESALE_ADDRESS, data: SELECTORS.vestingSchedules + paddedAddr }, "latest"]),
          rpcCall("eth_call", [{ to: PRESALE_ADDRESS, data: SELECTORS.getClaimableAmount + paddedAddr }, "latest"]),
        ]);

        setUsdtBalance(fromWeiHex(usdtBalHex, 18));
        setUserClaimableNow(fromWeiHex(claimableHex, 18));

        if (vestingHex && vestingHex.length >= 130) {
          const clean = vestingHex.replace("0x", "");
          const totalPurchasedHex = "0x" + clean.slice(0, 64);
          setUserTotalPurchased(fromWeiHex(totalPurchasedHex, 18));
        }
      }
    } catch (err) {
      console.error("On-chain sync warning:", err);
    } finally {
      setIsSyncingChain(false);
    }
  }, []);

  useEffect(() => {
    syncOnChainData("");
    const provider = getInjectedProvider();

    if (provider) {
      provider.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          syncOnChainData(accounts[0]);
        }
      });

      const handleAccountsChanged = (accounts) => {
        const addr = accounts[0] || "";
        setWalletAddress(addr);
        syncOnChainData(addr);
      };

      const handleChainChanged = () => {
        if (walletAddress) syncOnChainData(walletAddress);
      };

      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("chainChanged", handleChainChanged);

      return () => {
        if (provider.removeListener) {
          provider.removeListener("accountsChanged", handleAccountsChanged);
          provider.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [syncOnChainData, walletAddress]);

  const ensureBscMainnet = async () => {
    const provider = getInjectedProvider();
    if (!provider) throw new Error("No Web3 wallet detected. Please install MetaMask or Trust Wallet.");
    const currentChain = await provider.request({ method: "eth_chainId" });
    if (currentChain !== BSC_CHAIN_ID_HEX && parseInt(currentChain, 16) !== 56) {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BSC_CHAIN_ID_HEX }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BSC_CHAIN_ID_HEX,
                chainName: "BNB Smart Chain Mainnet",
                nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                rpcUrls: ["https://bsc-dataseed1.binance.org/"],
                blockExplorerUrls: ["https://bscscan.com/"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }
  };

  const connectWallet = async () => {
    setTxStatus("idle");
    setTxMessage("");
    const provider = getInjectedProvider();
    if (!provider) {
      setTxStatus("error");
      setTxMessage("Web3 wallet not found. Please open this page in MetaMask or Trust Wallet.");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      await ensureBscMainnet();
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
        await syncOnChainData(accounts[0]);
      }
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.message || "Wallet connection rejected.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Execute Presale Purchase (BNB or USDT)
  const handlePurchase = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    const normalizedAmountStr = String(payAmount).replace(",", ".");
    const numericAmount = parseFloat(normalizedAmountStr) || 0;

    if (numericAmount <= 0) {
      setTxStatus("error");
      setTxMessage("Please enter a valid purchase amount greater than 0.");
      return;
    }

    if (payToken === "BNB" && bnbBalance > 0 && numericAmount > bnbBalance) {
      setTxStatus("error");
      setTxMessage(`Insufficient BNB balance (${bnbBalance.toFixed(5)} BNB available).`);
      return;
    }

    if (payToken === "USDT" && usdtBalance > 0 && numericAmount > usdtBalance) {
      setTxStatus("error");
      setTxMessage(`Insufficient USDT balance (${usdtBalance.toFixed(2)} USDT available).`);
      return;
    }

    const provider = getInjectedProvider();
    setTxHash("");
    try {
      await ensureBscMainnet();

      if (payToken === "BNB") {
        setTxStatus("buying");
        setTxMessage("Confirm your BNB purchase in your wallet...");

        const cleanHex = toHex32(normalizedAmountStr, 18).replace(/^0+/, "");
        const weiHex = cleanHex ? "0x" + cleanHex : "0x0";

        const sentHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: walletAddress,
              to: PRESALE_ADDRESS,
              value: weiHex,
              data: SELECTORS.buyWithBNB, // 0x20f1fc61 (Verified on BscScan!)
              gas: "0x35b60", // 220,000 gas limit
            },
          ],
        });

        setTxMessage("Waiting for BSC Mainnet block confirmation...");
        await waitForReceipt(sentHash);

        setTxHash(sentHash);
        setTxStatus("success");
        setTxMessage(`Purchase confirmed! You secured ~${totalTokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} $AUR.`);
        await syncOnChainData(walletAddress);
      } else {
        setTxStatus("approving");
        setTxMessage("Step 1/2: Approve USDT spending in your wallet...");

        const amountHex32 = toHex32(normalizedAmountStr, 18);
        const approveData = SELECTORS.approve + padAddress(PRESALE_ADDRESS) + amountHex32;

        const approveHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: walletAddress,
              to: USDT_ADDRESS,
              data: approveData,
              gas: "0x15f90",
            },
          ],
        });

        setTxMessage("Step 1/2: Confirming USDT approval on BSC Mainnet...");
        await waitForReceipt(approveHash);

        setTxStatus("buying");
        setTxMessage("Step 2/2: Confirm $AUR purchase in your wallet...");

        const buyData = SELECTORS.buyWithUSDT + amountHex32;
        const buyHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: walletAddress,
              to: PRESALE_ADDRESS,
              data: buyData,
              gas: "0x35b60",
            },
          ],
        });

        setTxMessage("Step 2/2: Confirming $AUR allocation on BSC Mainnet...");
        await waitForReceipt(buyHash);

        setTxHash(buyHash);
        setTxStatus("success");
        setTxMessage(`Purchase confirmed! You secured ~${totalTokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} $AUR.`);
        await syncOnChainData(walletAddress);
      }
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.message || "Transaction failed or cancelled.");
    }
  };

  // Claim Vested Tokens
  const handleClaimTokens = async () => {
    if (!walletAddress || userClaimableNow <= 0) return;
    const provider = getInjectedProvider();
    setTxStatus("claiming");
    setTxMessage("Confirm token claim in your wallet...");
    try {
      await ensureBscMainnet();
      const claimHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: PRESALE_ADDRESS,
            data: SELECTORS.claimTokens,
            gas: "0x249f0",
          },
        ],
      });
      setTxMessage("Confirming token claim on BSC Mainnet...");
      await waitForReceipt(claimHash);
      setTxHash(claimHash);
      setTxStatus("success");
      setTxMessage("Vested $AUR tokens successfully claimed to your wallet!");
      await syncOnChainData(walletAddress);
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.message || "Claim failed or TGE not started yet.");
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(""), 2000);
  };

  const stageTargetTokens = 15000000;
  const stageProgressPercent = Math.min(100, Math.max(4, (tokensSold / stageTargetTokens) * 100));
  // Target waktu berakhirnya Stage 1: 30 hari (1 bulan) dari 14 November 2026 -> 14 Desember 2026
const STAGE1_END_TIMESTAMP = new Date('2026-12-14T23:59:59Z').getTime();

const [timeLeft, setTimeLeft] = useState({
  days: '30',
  hours: '00',
  minutes: '00',
  seconds: '00',
});

useEffect(() => {
  const updateCountdown = () => {
    const now = Date.now();
    const diff = Math.max(0, STAGE1_END_TIMESTAMP - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    setTimeLeft({
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    });
  };

  updateCountdown();
  const interval = setInterval(updateCountdown, 1000);
  return () => clearInterval(interval);
}, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-blue-600/15 rounded-full blur-3xl" />
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
  src="/aura-logo.png"
  alt="AURA Protocol Logo"
  className="w-10 h-10 rounded-full object-cover shadow-lg shadow-cyan-500/20"
/>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                AURA PROTOCOL
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                BSC Mainnet
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#presale" className="hover:text-cyan-400 transition">Presale</a>
            <a href="#stages" className="hover:text-cyan-400 transition">Stages</a>
            <a href="#tokenomics" className="hover:text-cyan-400 transition">Tokenomics</a>
            <a href="#roadmap" className="hover:text-cyan-400 transition">Roadmap</a>
            <a
              href={`https://bscscan.com/address/${PRESALE_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              Verified Contract
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {walletAddress ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-cyan-500/40 px-3.5 py-2 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-cyan-300 font-semibold">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero & Live Presale Widget */}
      <main id="presale" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Protocol Value Proposition */}
          <div className="lg:col-span-7 space-y-8 pt-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              NEXT-GEN AI & DEFI LIQUIDITY INFRASTRUCTURE
            </div>

{/* Animated 3D-Style Floating AURA Coin & Blockchain Orbit */}
<div className="flex items-center gap-5 mb-4">
  <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
    {/* Ambient Glow di Belakang Koin */}
    <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-cyan-500/30 to-indigo-500/30 blur-xl animate-pulse" />

    {/* Garis Orbit Blockchain Luar (Berputar Searah Jarum Jam + Node Titik) */}
    <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/45 animate-orbit-cw">
      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
    </div>

    {/* Garis Orbit Blockchain Dalam (Berputar Berlawanan Arah + Node Titik) */}
    <div className="absolute inset-2.5 rounded-full border border-indigo-400/35 animate-orbit-ccw">
      <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
    </div>

    {/* Logo Koin AURA Melayang Naik-Turun */}
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-br from-cyan-400/50 via-slate-900 to-indigo-500/50 shadow-[0_0_25px_rgba(34,211,238,0.35)] animate-float-coin">
      <img
        src="/aura-logo.png"
        alt="AURA Coin Animated"
        className="w-full h-full rounded-full object-cover"
      />
    </div>
  </div>

  {/* Badge Status Live Chain di Sebelah Koin */}
  <div className="space-y-1.5">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      <span>BSC Mainnet Node Active</span>
    </div>
    <p className="text-xs text-slate-400 max-w-xs">
      Autonomous Smart-Contract Liquidity & Real-Time On-Chain Distribution
    </p>
  </div>
</div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Empowering Autonomous{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                DeFi Yield
              </span>{" "}
              on BNB Chain
            </h1>

            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
              AURA Protocol ($AUR) combines real-time Chainlink oracle pricing with transparent on-chain linear vesting. Secure your early-stage allocation directly via BNB or USDT before PancakeSwap V3 listing.
            </p>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Supply</p>
                <p className="text-xl font-extrabold text-white mt-1">100M $AUR</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Stage {activeStage} Price</p>
                <p className="text-xl font-extrabold text-cyan-400 mt-1">${currentStageData.price}</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Listing Price</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">${LISTING_PRICE}</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">BNB Oracle</p>
                <p className="text-xl font-extrabold text-amber-400 mt-1">${bnbPriceUsd.toFixed(2)}</p>
              </div>
            </div>

            {/* Verified Smart Contracts Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Official BSC Mainnet Contracts
                </span>
                <button
                  onClick={() => syncOnChainData(walletAddress)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingChain ? "animate-spin" : ""}`} />
                  Refresh On-Chain
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 mb-0.5">$AUR Token Contract</p>
                    <p className="font-mono text-slate-200">
                      {TOKEN_ADDRESS.slice(0, 10)}...{TOKEN_ADDRESS.slice(-8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyToClipboard(TOKEN_ADDRESS, "token")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Copy Token Address"
                    >
                      {copiedAddress === "token" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://bscscan.com/token/${TOKEN_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                      title="View on BscScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 mb-0.5">Presale & Vesting Contract</p>
                    <p className="font-mono text-slate-200">
                      {PRESALE_ADDRESS.slice(0, 10)}...{PRESALE_ADDRESS.slice(-8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyToClipboard(PRESALE_ADDRESS, "presale")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Copy Presale Address"
                    >
                      {copiedAddress === "presale" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://bscscan.com/address/${PRESALE_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                      title="View on BscScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Web3 Presale Swap & Vesting Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-cyan-500/10 space-y-6">
              {/* Stage Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                    Stage {activeStage} / 5 • {currentStageData.name}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-0.5">
                    1 $AUR = ${currentStageData.price}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    +{currentStageData.bonus} Bonus
                  </span>
                </div>
              </div>

              {/* On-Chain Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">On-Chain Sold</span>
                  <span className="text-cyan-300 font-bold">
                    {tokensSold.toLocaleString(undefined, { maximumFractionDigits: 0 })} / 15,000,000 $AUR
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${stageProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Next Stage Price: $0.0060</span>
                  <span>Listing: ${LISTING_PRICE}</span>
                </div>
              </div>

{/* Stage 1 Countdown Timer (30 Days) */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
          <span>Stage 1 Ends In</span>
          <span className="text-cyan-400 font-semibold">30-Day Seed Round</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Mins', value: timeLeft.minutes },
            { label: 'Secs', value: timeLeft.seconds },
          ].map((unit, idx) => (
            <div
              key={idx}
              className="py-2 px-1 rounded-xl bg-slate-950/90 border border-slate-800/90"
            >
              <div className="text-base sm:text-lg font-extrabold text-white font-mono">
                {unit.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Softcap & Hardcap Info */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90">
          <div className="text-[11px] text-slate-400">Softcap Target</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">$60,000 USD</div>
          <div className="text-[11px] text-slate-500">≈ 95.32 BNB</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90">
          <div className="text-[11px] text-slate-400">Hardcap Target</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">$150,000 USD</div>
          <div className="text-[11px] text-slate-500">≈ 238.30 BNB</div>
        </div>
      </div>
              {/* Payment Method Switcher */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPayToken("BNB");
                    setPayAmount("0.001");
                  }}
                  className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    payToken === "BNB"
                      ? "bg-amber-500/15 border-amber-400 text-amber-300 shadow-inner"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  BNB (Native)
                </button>
                <button
                  onClick={() => {
                    setPayToken("USDT");
                    setPayAmount("10");
                  }}
                  className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    payToken === "USDT"
                      ? "bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-inner"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  USDT (BEP-20)
                </button>
              </div>

              {/* Input Box */}
              <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>You Pay ({payToken})</span>
                    <span>
                      Balance:{" "}
                      <strong className="text-slate-200">
                        {payToken === "BNB" ? `${bnbBalance.toFixed(5)} BNB` : `${usdtBalance.toFixed(2)} USDT`}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent text-2xl font-extrabold text-white focus:outline-none"
                    />
                    {walletAddress && (
                      <button
                        onClick={() =>
                          setPayAmount(
                            payToken === "BNB"
                              ? Math.max(0, bnbBalance - 0.001).toFixed(5)
                              : usdtBalance.toFixed(2)
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 text-xs font-bold hover:bg-cyan-500/25 cursor-pointer"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Estimated Value: ≈ ${usdEquivalent.toFixed(2)} USD
                  </p>
                </div>

                {/* Output Box */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>You Receive ($AUR + {currentStageData.bonus} Bonus)</span>
                    <span className="text-emerald-400 font-semibold">
                      +{bonusTokens.toLocaleString(undefined, { maximumFractionDigits: 1 })} Bonus
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-cyan-400">
                    {totalTokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} $AUR
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {!walletAddress ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-base shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Wallet className="w-5 h-5" />
                  {isConnecting ? "Connecting Wallet..." : "Connect Wallet to Buy"}
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={txStatus === "approving" || txStatus === "buying"}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-slate-950 font-extrabold text-base shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {txStatus === "approving" || txStatus === "buying" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing on BSC Mainnet...
                    </>
                  ) : (
                    <>
                      Buy $AUR with {payToken}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}

              {/* Transaction Status Notification */}
              {txStatus !== "idle" && txMessage && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                    txStatus === "success"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                      : txStatus === "error"
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                      : "bg-cyan-500/10 border-cyan-500/40 text-cyan-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {txStatus === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : txStatus === "error" ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-spin" />
                    )}
                    <p className="font-medium leading-relaxed">{txMessage}</p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://bscscan.com/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-semibold pl-6"
                    >
                      Verify Transaction on BscScan
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* On-Chain Vesting Dashboard */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    Your On-Chain Vesting
                  </span>
                  <span className="text-[11px] text-slate-400">20% TGE + Linear</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-slate-400">Total Purchased + Bonus</p>
                    <p className="text-base font-extrabold text-white mt-0.5">
                      {userTotalPurchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} $AUR
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-slate-400">Claimable Now</p>
                    <p className="text-base font-extrabold text-emerald-400 mt-0.5">
                      {userClaimableNow.toLocaleString(undefined, { maximumFractionDigits: 2 })} $AUR
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClaimTokens}
                  disabled={!walletAddress || userClaimableNow <= 0 || txStatus === "claiming"}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 transition cursor-pointer"
                >
                  {userClaimableNow > 0
                    ? `Claim ${userClaimableNow.toFixed(2)} $AUR Now`
                    : "Token Claim Unlocks at TGE"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Presale Stages Breakdown */}
        <section id="stages" className="mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold">5-Stage Presale Structure</h2>
            <p className="text-slate-400 text-sm">
              Early participants benefit from lower token prices and higher bonus allocations before public DEX listing at ${LISTING_PRICE}.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PRESALE_STAGES.map((item) => {
              const isCurrent = item.stage === activeStage;
              return (
                <div
                  key={item.stage}
                  className={`rounded-2xl p-5 border transition ${
                    isCurrent
                      ? "bg-gradient-to-b from-cyan-500/15 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-cyan-400 uppercase">Stage {item.stage}</span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-400 text-slate-950 rounded-full">
                        LIVE
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-base">{item.name}</h3>
                  <p className="text-2xl font-black text-white mt-2">${item.price}</p>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Stage Bonus:</span>
                      <span className="text-emerald-400 font-bold">+{item.bonus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allocation:</span>
                      <span className="text-slate-200">{item.allocation}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tokenomics & Vesting Section */}
        <section id="tokenomics" className="mt-24 grid lg:grid-cols-2 gap-10 items-center">
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold">Tokenomics Allocation</h2>
                <p className="text-xs text-slate-400">Fixed 100,000,000 $AUR Maximum Supply</p>
              </div>
            </div>

            <div className="space-y-4">
              {TOKENOMICS.map((t) => (
                <div key={t.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-200">{t.label}</span>
                    <span className="text-slate-400">
                      {t.amount} ({t.percent}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div className={`h-full ${t.color} rounded-full`} style={{ width: `${t.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold">Transparent Vesting Schedule</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                To protect post-listing liquidity and ensure sustainable price appreciation, all presale purchases are governed by our audited smart contract vesting schedule:
              </p>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span><strong>20% Unlocked at TGE</strong> immediately upon PancakeSwap listing</span>
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span><strong>30-Day Cliff Period</strong> followed by linear block-by-block release</span>
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span><strong>100% On-Chain Verification</strong> directly inside your wallet dashboard</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section id="roadmap" className="mt-24 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold">Strategic Roadmap</h2>
            <p className="text-slate-400 text-sm">
              Key milestones driving AURA Protocol from mainnet launch to cross-chain DeFi adoption.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROADMAP.map((phase) => (
              <div
                key={phase.phase}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                    {phase.phase}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      phase.status === "Completed"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : phase.status === "Active Now"
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {phase.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{phase.title}</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
<footer className="border-t border-slate-800/80 bg-slate-950 py-8">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6 text-xs text-slate-400">
    
    {/* Sisi Kiri: Nama Protokol & Jaringan */}
    <div className="flex items-center gap-2 text-center sm:text-left">
      <span className="font-extrabold text-white">AURA PROTOCOL ($AUR)</span>
      <span>• Built on BNB Smart Chain Mainnet</span>
    </div>

    {/* Bagian Tengah: Ikon Sosial Media & Tombol Whitepaper */}
    <div className="flex items-center flex-wrap justify-center gap-3">
      {/* Telegram */}
      <a
        href="https://t.me/AuraProtocolcommunity"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 transition flex items-center gap-1.5"
        title="Telegram Community"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.622-.168.9-.5 1.201-.82 1.23-.697.064-1.228-.46-1.903-.903-1.07-.702-1.677-1.139-2.716-1.823-1.203-.795-.423-1.231.262-1.944.179-.185 3.28-3.004 3.342-3.257.008-.033.015-.15-.058-.212-.073-.062-.18-.041-.258-.024-.11.025-1.859 1.183-5.242 3.475-.496.341-.944.507-1.344.498-.442-.011-1.29-.249-1.921-.454-.775-.245-1.391-.375-1.339-.792.028-.222.333-.448.918-.682 3.597-1.562 5.998-2.585 7.202-3.07 3.428-1.387 4.143-1.628 4.608-1.636.102-.002.331.024.479.143.124.1.159.234.173.328.017.094.034.312.018.482z"/>
        </svg>
        <span className="hidden sm:inline">Telegram</span>
      </a>

      {/* Twitter / X */}
      <a
        href="https://twitter.com/auraprotocol"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 transition flex items-center gap-1.5"
        title="Twitter / X"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span className="hidden sm:inline">Twitter</span>
      </a>

      {/* Discord */}
      <a
        href="https://discord.gg/auraprotocol"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 transition flex items-center gap-1.5"
        title="Discord Server"
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        <span className="hidden sm:inline">Discord</span>
      </a>

      {/* Tombol Whitepaper PDF */}
      <a
        href="/AURA-Protocol-Official-Whitepaper.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 transition flex items-center gap-1.5 font-semibold"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <span>Whitepaper</span>
      </a>
    </div>

    {/* Sisi Kanan: Tautan Kontrak */}
    <div className="flex items-center gap-3">
      <a
        href={`https://bscscan.com/token/${TOKEN_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-cyan-400 transition"
      >
        Token Contract
      </a>
      <span>•</span>
      <a
        href={`https://bscscan.com/address/${PRESALE_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-cyan-400 transition"
            >
              Presale Contract
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}