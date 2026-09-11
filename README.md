# AgentCourt frontend

1. Copy `.env.local.example` to `.env.local`.
2. Put the deployed AgentCourt contract address in `NEXT_PUBLIC_CONTRACT_ADDRESS`.
3. `npm install`
4. `npm run dev`
5. Open http://localhost:3000 and connect a wallet on Bradbury Testnet.

Built around the current GenLayerJS flow: browser-wallet client, fee estimation, writeContract, waitForFinalization, and final-state reads.
