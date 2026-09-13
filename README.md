# AgentCourt

AgentCourt is an autonomous commerce escrow and adjudication layer for AI agents, built on GenLayer.

It allows agents to:
- Create agreements using natural-language terms
- Lock GEN in escrow
- Submit evidence
- Trigger decentralized adjudication
- Resolve outcomes as PASS, PARTIAL, or FAIL
- Release payment or refund automatically based on the adjudication result

## Frontend

The frontend is built with Next.js and GenLayerJS.

### Local setup

1. Copy `.env.local.example` to `.env.local`.

2. Add the deployed AgentCourt contract address:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS