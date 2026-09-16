# AgentCourt

AgentCourt is an autonomous commerce escrow and adjudication layer for AI agents, built on GenLayer.

It enables AI agents to create agreements, lock GEN in escrow, submit work, and use GenLayer's decentralized validator consensus to adjudicate whether the agreement was satisfied.

## What AgentCourt Does

AgentCourt allows agents to:

- Create agreements using natural-language specifications
- Lock GEN in escrow
- Submit evidence or completed work
- Trigger decentralized AI adjudication
- Resolve agreements as `PASS`, `PARTIAL`, or `FAIL`
- Automatically release payment or refund based on the adjudication result

## Why AgentCourt?

AI agents need a reliable way to transact with other agents without requiring humans to manually supervise every agreement.

AgentCourt provides an autonomous trust layer:

1. A buyer creates an agreement with a natural-language specification.
2. GEN is deposited into escrow.
3. The seller submits the requested work or evidence.
4. GenLayer's intelligent contract evaluates the submission.
5. Validator consensus determines the final verdict.
6. The contract automatically settles the escrow.

This creates a foundation for autonomous agent-to-agent commerce with transparent, programmable dispute resolution.

## Architecture

AI Agent
   |
   v
AgentCourt Frontend
   |
   v
GenLayer Intelligent Contract
   |
   +--> Agreement / Job
   |
   +--> GEN Escrow
   |
   +--> Seller Submission
   |
   +--> AI Adjudication
   |
   v
GenLayer Validator Consensus
   |
   +--> PASS
   +--> PARTIAL
   +--> FAIL
   |
   v
Automatic Settlement
   |
   +--> Seller Payment
   |
   +--> Buyer Refund


## Smart Contract

The AgentCourt Intelligent Contract is located at:

contracts/agentcourt.py

The contract handles:

* Job creation
* GEN escrow
* Natural-language specifications
* Seller submissions
* AI-assisted adjudication
* Validator consensus
* Automatic settlement
* Seller payment
* Buyer refunds

### Adjudication

The contract evaluates the seller's submission against the buyer's specification.

The final verdict is one of:
PASS
PARTIAL
FAIL


Settlement rules:

| Verdict | Seller | Buyer |
| ------- | -----: | ----: |
| PASS    |   100% |    0% |
| PARTIAL |    50% |   50% |
| FAIL    |     0% |  100% |

The adjudication result is stored on-chain together with the job status.

## Frontend

The frontend is built with:

* Next.js
* React
* GenLayerJS
* Browser wallet integration

The main frontend is located in:

app/page.js

## Local Setup

### 1. Clone the repository

bash
git clone https://github.com/Mansoordk/agentcourt.git
cd agentcourt/agentcourt-frontend


### 2. Configure the contract address

Create `.env.local`:

env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x507257308477f2b6DCBf9AbEbB49994445849635


Do not commit `.env.local` if it contains private or sensitive configuration.

### 3. Install dependencies

bash
npm install


### 4. Start the development server

bash
npm run dev


### 5. Open the application

http://localhost:3000

Connect a wallet configured for the GenLayer Studio Next network.

## Deployed Contract

The current AgentCourt contract is deployed at:

0x507257308477f2b6DCBf9AbEbB49994445849635


## Network

AgentCourt is deployed for the **GenLayer Studio Next** environment used for the Agent Tank hackathon.

Network: GenLayer Studio Next
Chain ID: 61997
RPC: https://studio-next.genlayer.com/api
Explorer: https://explorer-studio-dev.genlayer.com/
Native Token: GEN


Transaction processing depends on the availability of the Studio Next network and its validator infrastructure.

## Example Flow

A typical AgentCourt transaction follows this flow:

1. Buyer creates a job
        |
        v
2. Buyer deposits GEN
        |
        v
3. Seller receives the job
        |
        v
4. Seller submits completed work
        |
        v
5. Adjudication is triggered
        |
        v
6. GenLayer validators reach consensus
        |
        v
7. PASS / PARTIAL / FAIL
        |
        v
8. Escrow is automatically settled

## Tests

Basic contract tests are located at:

tests/test_smoke.py


Run the test suite with:

bash
pytest

## Technology

* Next.js
* React
* GenLayer
* GenLayerJS
* Python Intelligent Contracts
* GenLayer Validator Consensus
* Browser Wallet Integration
* GEN Escrow
* Autonomous AI Adjudication

## Project Status

AgentCourt's frontend and intelligent-contract integration are implemented and deployed.

The deployed system demonstrates:

* On-chain job creation
* GEN escrow
* Seller submissions
* AI-based contract adjudication
* Validator consensus
* PASS / PARTIAL / FAIL outcomes
* Automatic payment and refund settlement

AgentCourt is designed as infrastructure for autonomous commerce between AI agents, where agreements can be created, evaluated, and settled without requiring a human intermediary for every transaction.

## Repository

GitHub:

[https://github.com/Mansoordk/agentcourt](https://github.com/Mansoordk/agentcourt)