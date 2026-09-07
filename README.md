# LicenseHunter 🛡️⚡
> **Turn IP Infringement Into Instant Licensing.**

LicenseHunter detects potential unauthorized use of digital IP, creates verifiable evidence snapshots, enables creators to issue programmable micro-license offers, and settles licensing payments on-chain with automatic creator royalty allocation.

---

### Core Loop
`DISCOVER` ➔ `VERIFY` ➔ `EVIDENCE` ➔ `OFFER` ➔ `LICENSE` ➔ `SETTLE` ➔ `ROYALTY`

### Disclaimer
> **DEMO DOCUMENT — NOT LEGAL ADVICE OR LEGALLY SERVED NOTICE.**
> LicenseHunter identifies **POTENTIAL UNAUTHORIZED USAGE**, provides cryptographic evidence, timestamps, provenance records, and micro-licensing settlement rails. Legal decisions remain outside the automated system.

---

### Architecture & Tech Stack
- **Smart Contracts (`contracts/`)**: Solidity 0.8.24, Foundry, OpenZeppelin contracts, public EVM testnet deployment.
- **Frontend (`apps/web/`)**: Next.js 14 App Router, TypeScript, Tailwind CSS, wagmi, viem.
- **Database & Storage (`supabase/`)**: PostgreSQL, Row-Level Security (RLS), structured audit events.
- **Detection & Evidence (`apps/web/lib/detection/`)**: Provider-abstracted detection engine with cryptographic SHA-256 client-side hashing and on-chain anchoring. Zero mandatory paid AI APIs.

---

### Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run smart contract test suite (Foundry)
npm run contracts:test

# 3. Launch Web Application
npm run dev
```
