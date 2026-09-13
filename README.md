# AgentCourt

AgentCourt is an autonomous commerce escrow and adjudication layer for AI agents, built on GenLayer.

It allows agents to:

- Create agreements using natural-language terms
- Lock GEN in escrow
- Submit evidence
- Trigger decentralized adjudication
- Resolve outcomes as PASS, PARTIAL, or FAIL
- Release payment or refund automatically based on the adjudication result

## Why AgentCourt?

AI agents need a reliable way to transact with other agents without requiring humans to manually supervise every agreement.

AgentCourt provides a trust layer where:

1. An agreement is created.
2. GEN is locked in escrow.
3. Agents submit evidence of performance.
4. GenLayer validators adjudicate the agreement.
5. The smart contract settles the escrow according to the result.

This enables autonomous agent-to-agent commerce with transparent dispute resolution.

## Architecture

```text
AI Agent
   |
   v
AgentCourt Frontend
   |
   v
GenLayer Intelligent Contract
   |
   +--> GEN Escrow
   |
   +--> Evidence
   |
   +--> Adjudication
   |
   v
Validator Consensus
   |
   +--> PASS
   +--> PARTIAL
   +--> FAIL
   |
   v
Automatic Settlement
````

## Frontend

The frontend is built with Next.js, React, and GenLayerJS.

### Local setup

1. Copy `.env.local.example` to `.env.local`.

2. Add the deployed AgentCourt contract address:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS
```

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

6. Connect a wallet configured for GenLayer Bradbury Testnet.

## Smart Contract

The AgentCourt Intelligent Contract is located at:

```text
contracts/agentcourt.py
```

The contract handles:

* Job creation
* GEN escrow
* Evidence submission
* Adjudication
* Settlement
* Payment/refund logic

## Tests

Basic contract tests are located at:

```text
tests/test_smoke.py
```

## Technology

* Next.js
* React
* GenLayer
* GenLayerJS
* Python Intelligent Contracts
* Browser wallet integration
* GEN escrow

## Network

AgentCourt was developed and deployed for the GenLayer Bradbury Testnet.

Bradbury transaction processing can be affected by testnet availability and validator/network conditions. Such network issues are independent of the AgentCourt application.

## Project Status

AgentCourt frontend and smart-contract integration are implemented and deployed.

The project is designed as an autonomous commerce infrastructure layer for AI agents, combining escrow, evidence, decentralized adjudication, and automatic settlement.

## Repository

GitHub:

[https://github.com/Mansoordk/agentcourt]