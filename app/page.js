'use client';

import { useMemo, useState } from 'react';
import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';

const CONTRACT =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() || '';

const SPEC = `Produce a list of 5 Nigerian technology companies.
For every company provide:
1. Company name
2. Official website
3. One sentence describing what it does.
All 5 companies must be real and the websites must be accessible.`;

const RESULT = `1. Flutterwave
Website: https://flutterwave.com
Description: A payments technology company providing payment infrastructure for businesses.

2. Paystack
Website: https://paystack.com
Description: A payments platform that helps businesses accept and make payments.

3. Andela
Website: https://andela.com
Description: A technology company connecting businesses with distributed engineering talent.

4. Interswitch
Website: https://interswitchgroup.com
Description: A digital payments and commerce company operating across Africa.

5. Moniepoint
Website: https://moniepoint.com
Description: A financial technology company providing payment and banking infrastructure.`;

const short = (x) =>
  x ? `${x.slice(0, 6)}…${x.slice(-4)}` : 'Not connected';

export default function Home() {
  const [wallet, setWallet] = useState('');
  const [jobId, setJobId] = useState('1');
  const [spec, setSpec] = useState(SPEC);
  const [result, setResult] = useState(RESULT);
  const [amount, setAmount] = useState('1');
  const [status, setStatus] = useState(
    CONTRACT ? 'Ready' : 'Contract address missing'
  );
  const [verdict, setVerdict] = useState('');
  const [job, setJob] = useState(null);

  const can = useMemo(
    () => Boolean(wallet && CONTRACT),
    [wallet]
  );

  async function connect() {
    try {
      if (!window.ethereum) {
        throw new Error(
          'Install MetaMask or another EVM wallet.'
        );
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts?.length) {
        throw new Error('No wallet account found.');
      }

      setWallet(accounts[0]);

      if (!CONTRACT) {
        setStatus(
          'Wallet connected — add NEXT_PUBLIC_CONTRACT_ADDRESS'
        );
      } else {
        setStatus('Wallet connected');
      }
    } catch (e) {
      setStatus(
        e?.message || 'Wallet connection failed'
      );
    }
  }

  function getClient() {
    if (!wallet) {
      throw new Error(
        'Connect your wallet first.'
      );
    }

    if (!CONTRACT) {
      throw new Error(
        'Contract address is missing. Check .env.local.'
      );
    }

    if (!window.ethereum) {
      throw new Error(
        'Browser wallet provider not found.'
      );
    }

    return createClient({
      chain: testnetBradbury,
      account: wallet,
      provider: window.ethereum,
    });
  }

  // genlayer-js 1.1.8:
  // Do NOT use estimateTransactionFees() or
  // estimateTransactionFeesForWrite().
  async function write(functionName, args, value) {
    const c = getClient();

    setStatus('Waiting for wallet confirmation…');

    const tx = await c.writeContract({
      address: CONTRACT,
      functionName,
      args,
      ...(value !== undefined ? { value } : {}),
    });

    setStatus(
      'Transaction submitted. Waiting for GenLayer…'
    );

    return c.waitForFinalization({
      hash: tx,
    });
  }

  function assertSuccessful(receipt) {
    if (
      receipt?.txExecutionResultName !==
      'FINISHED_WITH_RETURN'
    ) {
      throw new Error(
        `${receipt?.statusName || 'Unknown status'} / ${
          receipt?.txExecutionResultName ||
          'Unknown execution result'
        }`
      );
    }
  }

  async function createJob() {
    try {
      if (!window.ethereum) {
        throw new Error(
          'Wallet not available.'
        );
      }

      if (!CONTRACT) {
        throw new Error(
          'Contract address missing. Check .env.local.'
        );
      }

      if (!wallet) {
        throw new Error(
          'Connect your wallet first.'
        );
      }

      if (!spec.trim()) {
        throw new Error(
          'Specification cannot be empty.'
        );
      }

      if (!amount || Number(amount) <= 0) {
        throw new Error(
          'Escrow must be greater than zero.'
        );
      }

      setStatus('Preparing escrow…');

      const seller = wallet.trim();

      const value =
        BigInt(amount) * 10n ** 18n;

      const receipt = await write(
        'create_job',
        [seller, spec],
        value
      );

      assertSuccessful(receipt);

      setStatus('Deal created');

      await refresh();
    } catch (e) {
      setStatus(
        e?.message ||
          'Failed to create deal'
      );
    }
  }

  async function submit() {
    try {
      if (!jobId || BigInt(jobId) < 1n) {
        throw new Error(
          'Enter a valid job ID.'
        );
      }

      if (!result.trim()) {
        throw new Error(
          'Submission cannot be empty.'
        );
      }

      setStatus('Submitting work…');

      const receipt = await write(
        'submit',
        [BigInt(jobId), result]
      );

      assertSuccessful(receipt);

      setStatus('Work submitted');

      await refresh();
    } catch (e) {
      setStatus(
        e?.message ||
          'Failed to submit work'
      );
    }
  }

  async function adjudicate() {
    try {
      if (!jobId || BigInt(jobId) < 1n) {
        throw new Error(
          'Enter a valid job ID.'
        );
      }

      setStatus(
        'Validators adjudicating…'
      );

      const receipt = await write(
        'adjudicate',
        [BigInt(jobId)]
      );

      assertSuccessful(receipt);

      await refresh();

      setStatus('Case resolved');
    } catch (e) {
      setStatus(
        e?.message ||
          'Adjudication failed'
      );
    }
  }

  async function refresh() {
    try {
      if (!CONTRACT) {
        throw new Error(
          'Contract address missing. Check .env.local.'
        );
      }

      const c = createClient({
        chain: testnetBradbury,
      });

      const s = await c.readContract({
        address: CONTRACT,
        functionName: 'get_job',
        args: [BigInt(jobId)],
        transactionHashVariant:
          TransactionHashVariant.LATEST_FINAL,
      });

      setJob(s);
      setVerdict(s?.verdict || '');

      if (s?.status) {
        setStatus(
          `Job ${jobId}: ${s.status}`
        );
      }
    } catch (e) {
      setStatus(
        e?.message ||
          'Unable to read contract'
      );
    }
  }

  return (
    <main>
      <nav>
        <div className="brand">
          <span className="mark">A</span>
          AGENTCOURT
        </div>

        <div className="navRight">
          <span className="network">
            <i /> Bradbury Testnet
          </span>

          <button
            className="wallet"
            onClick={connect}
          >
            {wallet
              ? short(wallet)
              : 'Connect wallet'}
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          THE COURT FOR THE AGENT ECONOMY
        </div>

        <h1>
          When agents transact,
          <br />
          <em>who decides?</em>
        </h1>

        <p>
          Natural-language agreements. GEN escrow.
          Evidence. GenLayer validator adjudication.
          Automatic settlement.
        </p>

        <div className="actions">
          <button
            className="primary"
            onClick={() =>
              document
                .getElementById('deal')
                ?.scrollIntoView({
                  behavior: 'smooth',
                })
            }
          >
            Create a deal →
          </button>

          <a
            href="https://docs.genlayer.com"
            target="_blank"
            rel="noreferrer"
          >
            GenLayer docs ↗
          </a>
        </div>
      </section>

      <section className="stats">
        {[
          ['01', 'Agreement', 'Natural language'],
          ['02', 'Escrow', 'GEN locked'],
          ['03', 'Evidence', 'Agent submission'],
          ['04', 'Adjudication', 'Validator consensus'],
          ['05', 'Settlement', 'Automatic payout'],
        ].map((x) => (
          <div key={x[0]}>
            <b>{x[0]}</b>
            <span>{x[1]}</span>
            <small>{x[2]}</small>
          </div>
        ))}
      </section>

      <section
        id="deal"
        className="workspace"
      >
        <div className="sectionHead">
          <div>
            <div className="eyebrow">
              LIVE PROTOCOL
            </div>

            <h2>
              Run an agent deal
            </h2>
          </div>

          <span className="status">
            {status}
          </span>
        </div>

        {!CONTRACT && (
          <div
            className="status"
            style={{
              marginBottom: '20px',
              borderColor: '#b33',
            }}
          >
            CONTRACT NOT CONFIGURED — add
            NEXT_PUBLIC_CONTRACT_ADDRESS to
            .env.local, then restart Next.js.
          </div>
        )}

        <div className="grid">
          <div className="card">
            <Title
              n="01"
              t="Create agreement"
            />

            <label>
              SELLER ADDRESS
            </label>

            <input
              value={wallet}
              onChange={(e) =>
                setWallet(e.target.value)
              }
              placeholder="0x…"
            />

            <label>
              SPECIFICATION
            </label>

            <textarea
              value={spec}
              onChange={(e) =>
                setSpec(e.target.value)
              }
              rows="9"
            />

            <div className="row">
              <div>
                <label>
                  ESCROW
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                />
              </div>

              <button
                className="dark"
                disabled={!can}
                onClick={createJob}
              >
                Lock GEN →
              </button>
            </div>
          </div>

          <div className="card">
            <Title
              n="02"
              t="Submit evidence"
            />

            <label>
              JOB ID
            </label>

            <input
              type="number"
              min="1"
              value={jobId}
              onChange={(e) =>
                setJobId(e.target.value)
              }
            />

            <label>
              AGENT RESULT
            </label>

            <textarea
              value={result}
              onChange={(e) =>
                setResult(e.target.value)
              }
              rows="15"
            />

            <button
              className="dark full"
              disabled={!can}
              onClick={submit}
            >
              Submit work →
            </button>
          </div>

          <div className="card">
            <Title
              n="03"
              t="Adjudicate"
            />

            <div className="court">
              <strong>
                ⚖ GENLAYER COURT
              </strong>

              <small>
                Independent validator judgment
              </small>
            </div>

            <div className="steps">
              <div>
                ● Contract requirements
              </div>

              <div>
                ● Agent submission
              </div>

              <div>
                {verdict
                  ? '● Consensus reached'
                  : '○ Awaiting adjudication'}
              </div>
            </div>

            <button
              className="primary full"
              disabled={!can}
              onClick={adjudicate}
            >
              Open case →
            </button>

            <button
              className="ghost full"
              onClick={refresh}
            >
              Refresh state
            </button>

            {verdict && (
              <div className="verdict">
                <b>
                  {verdict}
                </b>

                <small>
                  {verdict === 'PASS'
                    ? '100% escrow released to seller'
                    : verdict === 'PARTIAL'
                    ? '50% escrow released to seller'
                    : 'Escrow refunded to buyer'}
                </small>
              </div>
            )}
          </div>
        </div>

        {job && (
          <pre className="state">
            {JSON.stringify(
              job,
              null,
              2
            )}
          </pre>
        )}
      </section>

      <section className="why">
        <div>
          <div className="eyebrow">
            WHY AGENTCOURT
          </div>

          <h2>
            Autonomous commerce needs a court.
          </h2>
        </div>

        <p>
          Smart contracts enforce deterministic
          rules. AgentCourt handles the hard
          question:{' '}
          <strong>
            did an agent actually satisfy a
            human-readable obligation?
          </strong>{' '}
          GenLayer supplies the adjudication layer.
        </p>
      </section>

      <footer>
        AGENTCOURT
        <span>
          BUILT ON GENLAYER
        </span>
      </footer>
    </main>
  );
}

function Title({ n, t }) {
  return (
    <div className="title">
      <i>{n}</i>
      <h3>{t}</h3>
    </div>
  );
}