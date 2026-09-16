'use client';

import { useMemo, useState } from 'react';
import {
  createClient,
  isSuccessful,
} from 'genlayer-js';
import {
  TransactionHashVariant,
} from 'genlayer-js/types';

const CONTRACT =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() || '';

const studioNext = {
  id: 61997,
  name: 'GenLayer Studio Devnet',
  isStudio: true,

  rpcUrls: {
    default: {
      http: ['https://studio-dev.genlayer.com/api'],
    },
  },

  nativeCurrency: {
    name: 'GEN Token',
    symbol: 'GEN',
    decimals: 18,
  },

  testnet: true,

  consensusMainContract: {
    address: '0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575',
  },

  consensusDataContract: {
    address: '0x88B0F18613Db92Bf970FfE264E02496e20a74D16',
  },

  stakingContract: null,
  feeManagerContract: null,
  roundsStorageContract: null,
  appealsContract: null,

  defaultNumberOfInitialValidators: 5,
  defaultConsensusMaxRotations: 3,
};

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

/*
 * Convert on-chain wei into a human-readable GEN amount.
 *
 * Example:
 * 1000000000000000000 -> 1 GEN
 */
function formatGen(wei) {
  if (
    wei === undefined ||
    wei === null ||
    wei === ''
  ) {
    return '0 GEN';
  }

  try {
    const value = BigInt(wei);
    const base = 1000000000000000000n;

    const whole = value / base;
    const remainder = value % base;

    if (remainder === 0n) {
      return `${whole.toString()} GEN`;
    }

    const decimals = remainder
      .toString()
      .padStart(18, '0')
      .replace(/0+$/, '');

    return `${whole.toString()}.${decimals} GEN`;
  } catch {
    return `${String(wei)} wei`;
  }
}

/*
 * The normal waitForTransactionReceipt() helper has been observed
 * to time out even when Studio Next already reports the transaction
 * as FINALIZED.
 *
 * We therefore poll getTransaction() directly.
 */
async function waitForAdjudication(
  client,
  txHash,
  maxAttempts = 60
) {
  for (
    let attempt = 0;
    attempt < maxAttempts;
    attempt++
  ) {
    try {
      const tx =
        await client.getTransaction({
          hash: txHash,
        });

      console.log(
        'ADJUDICATION TX:',
        tx
      );

      const statusName =
        String(
          tx?.statusName || ''
        ).toUpperCase();

      const statusNumber =
        Number(tx?.status);

      const executionResult =
        String(
          tx?.txExecutionResultName ||
          ''
        ).toUpperCase();

      if (
        statusName === 'FINALIZED' ||
        statusNumber === 5
      ) {
        if (
          executionResult &&
          executionResult !==
            'FINISHED_WITH_RETURN'
        ) {
          throw new Error(
            `Adjudication execution failed: ${
              statusName ||
              statusNumber
            } / ${
              executionResult
            }`
          );
        }

        return tx;
      }

      if (
        executionResult ===
        'FINISHED_WITH_ERROR'
      ) {
        throw new Error(
          `Adjudication execution failed: ${
            statusName ||
            statusNumber ||
            'unknown status'
          } / ${
            executionResult
          }`
        );
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            5000
          )
      );
    } catch (error) {
      if (
        String(
          error?.message || ''
        ).includes(
          'Adjudication execution failed'
        )
      ) {
        throw error;
      }

      console.log(
        'Still waiting for adjudication:',
        error
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            5000
          )
      );
    }
  }

  throw new Error(
    `Timed out checking adjudication transaction ${txHash}. The transaction may still be processing. Check Studio Next Explorer.`
  );
}

export default function Home() {
  const [wallet, setWallet] = useState('');
  const [jobId, setJobId] = useState('');
  const [spec, setSpec] = useState(SPEC);
  const [result, setResult] = useState(RESULT);
  const [amount, setAmount] = useState('1');

  const [status, setStatus] =
    useState(
      CONTRACT
        ? 'Ready'
        : 'Contract address missing'
    );

  const [verdict, setVerdict] =
    useState('');

  const [job, setJob] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const can = useMemo(
    () =>
      Boolean(
        wallet &&
        CONTRACT &&
        !busy
      ),
    [wallet, CONTRACT, busy]
  );

  async function connect() {
    try {
      if (!window.ethereum) {
        throw new Error(
          'Install MetaMask or another EVM wallet.'
        );
      }

      const accounts =
        await window.ethereum.request({
          method:
            'eth_requestAccounts',
        });

      if (!accounts?.length) {
        throw new Error(
          'No wallet account found.'
        );
      }

      setWallet(
        accounts[0]
      );

      if (!CONTRACT) {
        setStatus(
          'Wallet connected — add NEXT_PUBLIC_CONTRACT_ADDRESS'
        );
      } else {
        setStatus(
          'Wallet connected'
        );
      }
    } catch (e) {
      setStatus(
        e?.message ||
        'Wallet connection failed'
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
      chain: studioNext,
      account: wallet,
      provider:
        window.ethereum,
    });
  }

  async function write(
    functionName,
    args = [],
    value = 0n
  ) {
    const client =
      getClient();

    setBusy(true);

    setStatus(
      `Preparing ${functionName}…`
    );

    try {
      const call = {
        address: CONTRACT,
        functionName,
        args,
        value,
      };

      setStatus(
        `Estimating GenLayer fee for ${functionName}…`
      );

      const estimate =
        await client.estimateTransactionFeesForWrite(
          call
        );

      if (!estimate) {
        throw new Error(
          'Unable to estimate the GenLayer transaction fee.'
        );
      }

      if (
        estimate.feeValue ===
        0n
      ) {
        throw new Error(
          'GenLayer returned a zero transaction fee.'
        );
      }

      setStatus(
        `Fee estimated: ${estimate.feeValue.toString()} wei. Confirm in wallet…`
      );

      const txHash =
        await client.writeContract({
          ...call,

          fees: {
            distribution:
              estimate.distribution,

            messageAllocations:
              estimate.messageAllocations,

            feeValue:
              estimate.feeValue,
          },
        });

      setStatus(
        `Transaction submitted: ${short(
          txHash
        )} — waiting for decision…`
      );

      const receipt =
        await client.waitForDecision({
          hash: txHash,
        });

      if (
        !isSuccessful(receipt)
      ) {
        throw new Error(
          `Transaction failed: ${
            receipt?.statusName ||
            'unknown status'
          } / ${
            receipt?.txExecutionResultName ||
            'unknown execution result'
          }`
        );
      }

      setStatus(
        `Transaction successful: ${short(
          txHash
        )}`
      );

      return {
        receipt,
        txHash,
      };
    } finally {
      setBusy(false);
    }
  }

  function assertSuccessful(
    receipt
  ) {
    if (
      receipt?.txExecutionResultName &&
      receipt.txExecutionResultName !==
        'FINISHED_WITH_RETURN'
    ) {
      throw new Error(
        `${
          receipt?.statusName ||
          'Unknown status'
        } / ${
          receipt?.txExecutionResultName ||
          'Unknown execution result'
        }`
      );
    }
  }

  async function createJob() {
    try {
      if (!wallet) {
        throw new Error(
          'Connect your wallet first.'
        );
      }

      if (!CONTRACT) {
        throw new Error(
          'Contract address is missing.'
        );
      }

      const specification =
        spec.trim();

      if (!specification) {
        throw new Error(
          'Enter a deal specification.'
        );
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        throw new Error(
          'Escrow amount must be greater than 0.'
        );
      }

      const value =
        BigInt(
          Math.floor(
            numericAmount *
              1e18
          )
        );

      setBusy(true);

      const client =
        getClient();

      const call = {
        address: CONTRACT,
        functionName:
          'create_job',
        args: [
          wallet,
          specification,
        ],
        value,
      };

      setStatus(
        'Estimating GenLayer fee…'
      );

      const estimate =
        await client.estimateTransactionFeesForWrite(
          call
        );

      if (
        !estimate ||
        estimate.feeValue ===
          0n
      ) {
        throw new Error(
          'Unable to estimate the GenLayer transaction fee.'
        );
      }

      setStatus(
        'Confirm the deal in your wallet…'
      );

      const txHash =
        await client.writeContract({
          ...call,

          fees: {
            distribution:
              estimate.distribution,

            messageAllocations:
              estimate.messageAllocations,

            feeValue:
              estimate.feeValue,
          },
        });

      setStatus(
        `Deal submitted: ${short(
          txHash
        )} — waiting for decision…`
      );

      const receipt =
        await client.waitForDecision({
          hash: txHash,
        });

      if (
        !isSuccessful(receipt)
      ) {
        throw new Error(
          `Transaction failed: ${
            receipt?.statusName ||
            'unknown status'
          } / ${
            receipt?.txExecutionResultName ||
            'unknown execution result'
          }`
        );
      }

      setStatus(
        'Deal confirmed — finding Job ID…'
      );

      let newestJobId =
        null;

      for (
        let id = 1;
        id <= 1000;
        id++
      ) {
        try {
          const data =
            await client.readContract({
              address: CONTRACT,
              functionName:
                'get_job',
              args: [
                BigInt(id),
              ],
              transactionHashVariant:
                TransactionHashVariant.LATEST_NONFINAL,
            });

          if (
            data &&
            data.status &&
            [
              'OPEN',
              'SUBMITTED',
              'RESOLVED',
            ].includes(
              String(
                data.status
              ).toUpperCase()
            )
          ) {
            newestJobId =
              String(id);
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      if (!newestJobId) {
        throw new Error(
          'Deal was created, but the Job ID could not be detected.'
        );
      }

      setJobId(
        newestJobId
      );

      setVerdict('');

      setStatus(
        `Deal created successfully — Job #${newestJobId}`
      );

      await refresh(
        newestJobId
      );

      return receipt;
    } catch (e) {
      console.error(
        'Create job failed:',
        e
      );

      setStatus(
        e?.message ||
        'Failed to create deal.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    try {
      if (
        !jobId ||
        BigInt(jobId) <
          1n
      ) {
        throw new Error(
          'Create a deal first.'
        );
      }

      if (
        !result.trim()
      ) {
        throw new Error(
          'Submission cannot be empty.'
        );
      }

      const client =
        getClient();

      setStatus(
        `Checking Job #${jobId} status…`
      );

      const currentJob =
        await client.readContract({
          address: CONTRACT,
          functionName:
            'get_job',
          args: [
            BigInt(jobId),
          ],
          transactionHashVariant:
            TransactionHashVariant.LATEST_NONFINAL,
        });

      setJob(
        currentJob
      );

      const currentStatus =
        String(
          currentJob?.status ||
            ''
        ).toUpperCase();

      if (
        currentStatus !==
        'OPEN'
      ) {
        throw new Error(
          `Job #${jobId} cannot receive a submission. Current status: ${currentStatus}`
        );
      }

      setStatus(
        `Submitting work for Job #${jobId}…`
      );

      const {
        receipt,
      } = await write(
        'submit',
        [
          BigInt(jobId),
          result,
        ]
      );

      assertSuccessful(
        receipt
      );

      setStatus(
        `Work submitted for Job #${jobId}`
      );

      await refresh(
        jobId
      );
    } catch (e) {
      console.error(
        'Submit failed:',
        e
      );

      setStatus(
        e?.message ||
        'Failed to submit work'
      );
    }
  }

  async function adjudicate() {
    try {
      if (
        !jobId ||
        BigInt(jobId) <
          1n
      ) {
        throw new Error(
          'Create a deal first.'
        );
      }

      const client =
        getClient();

      setStatus(
        `Checking Job #${jobId} status…`
      );

      const currentJob =
        await client.readContract({
          address: CONTRACT,
          functionName:
            'get_job',
          args: [
            BigInt(jobId),
          ],
          transactionHashVariant:
            TransactionHashVariant.LATEST_NONFINAL,
        });

      setJob(
        currentJob
      );

      setVerdict(
        currentJob?.verdict ||
          ''
      );

      const currentStatus =
        String(
          currentJob?.status ||
            ''
        ).toUpperCase();

      if (
        currentStatus ===
        'OPEN'
      ) {
        setStatus(
          `Job #${jobId} is OPEN — submit the agent's work first.`
        );

        return;
      }

      if (
        currentStatus ===
        'RESOLVED'
      ) {
        setStatus(
          `Job #${jobId} is already resolved.`
        );

        return;
      }

      if (
        currentStatus !==
        'SUBMITTED'
      ) {
        setStatus(
          `Job #${jobId} cannot be adjudicated. Current status: ${
            currentStatus ||
            'UNKNOWN'
          }`
        );

        return;
      }

      setBusy(true);

      setStatus(
        `Estimating adjudication fee for Job #${jobId}…`
      );

      const call = {
        address: CONTRACT,
        functionName:
          'adjudicate',
        args: [
          BigInt(jobId),
        ],
        value: 0n,
      };

      const estimate =
        await client.estimateTransactionFeesForWrite(
          call
        );

      console.log(
        'ADJUDICATE FEE ESTIMATE:',
        estimate
      );

      if (
        !estimate ||
        estimate.feeValue ===
          0n
      ) {
        throw new Error(
          'Could not calculate the adjudication fee.'
        );
      }

      if (
        !estimate.messageAllocations ||
        estimate.messageAllocations.length ===
          0
      ) {
        throw new Error(
          'GenLayer did not return the message allocation required for exec_prompt().'
        );
      }

      console.log(
        'ADJUDICATE MESSAGE ALLOCATIONS:',
        estimate.messageAllocations
      );

      setStatus(
        'Confirm adjudication transaction in your wallet…'
      );

      const txHash =
        await client.writeContract({
          ...call,

          fees: {
            distribution:
              estimate.distribution,

            messageAllocations:
              estimate.messageAllocations,

            feeValue:
              estimate.feeValue,
          },
        });

      setStatus(
        `Adjudication submitted: ${short(
          txHash
        )} — waiting for GenLayer consensus…`
      );

      await waitForAdjudication(
        client,
        txHash
      );

      console.log(
        'ADJUDICATION FINALIZED:',
        txHash
      );

      setStatus(
        `Adjudication finalized — reading Job #${jobId}…`
      );

      const finalJob =
        await client.readContract({
          address: CONTRACT,
          functionName:
            'get_job',
          args: [
            BigInt(jobId),
          ],
          transactionHashVariant:
            TransactionHashVariant.LATEST_NONFINAL,
        });

      console.log(
        'FINAL JOB STATE:',
        finalJob
      );

      setJob(
        finalJob
      );

      const finalVerdict =
        String(
          finalJob?.verdict ||
            ''
        ).toUpperCase();

      setVerdict(
        finalVerdict
      );

      if (
        finalJob?.status !==
        'RESOLVED'
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              2000
            )
        );

        await refresh(
          jobId
        );
      }

      setStatus(
        finalVerdict
          ? `Job #${jobId} adjudicated successfully — verdict: ${finalVerdict}`
          : `Job #${jobId} adjudicated successfully — case resolved`
      );

      return finalJob;
    } catch (e) {
      console.error(
        'Adjudication failed:',
        e
      );

      setStatus(
        e?.message ||
        'Failed to adjudicate job.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function refresh(
    id = jobId
  ) {
    if (!id) return;

    try {
      const client =
        getClient();

      const data =
        await client.readContract({
          address: CONTRACT,
          functionName:
            'get_job',
          args: [
            BigInt(id),
          ],
          transactionHashVariant:
            TransactionHashVariant.LATEST_NONFINAL,
        });

      setJob(data);

      setVerdict(
        data?.verdict ||
          ''
      );
    } catch (error) {
      console.error(
        'Refresh failed:',
        error
      );
    }
  }

  /*
   * Format the job for display.
   *
   * IMPORTANT:
   * The actual contract value remains untouched.
   * Only the UI representation changes.
   */
  const displayJob =
    job
      ? {
          ...job,
          amount:
            formatGen(
              job.amount
            ),
        }
      : null;

  return (
    <main>
      <nav>
        <div className="brand">
          <span className="mark">
            A
          </span>

          AGENTCOURT
        </div>

        <div className="navRight">
          <span className="network">
            <i /> Studio Next
          </span>

          <button
            className="wallet"
            onClick={connect}
            disabled={busy}
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
          <em>
            who decides?
          </em>
        </h1>

        <p>
          Natural-language agreements.
          GEN escrow. Evidence.
          GenLayer validator adjudication.
          Automatic settlement.
        </p>

        <div className="actions">
          <button
            className="primary"
            onClick={() =>
              document
                .getElementById(
                  'deal'
                )
                ?.scrollIntoView({
                  behavior:
                    'smooth',
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
          [
            '01',
            'Agreement',
            'Natural language',
          ],
          [
            '02',
            'Escrow',
            'GEN locked',
          ],
          [
            '03',
            'Evidence',
            'Agent submission',
          ],
          [
            '04',
            'Adjudication',
            'Validator consensus',
          ],
          [
            '05',
            'Settlement',
            'Automatic payout',
          ],
        ].map((x) => (
          <div key={x[0]}>
            <b>{x[0]}</b>
            <span>
              {x[1]}
            </span>
            <small>
              {x[2]}
            </small>
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
              marginBottom:
                '20px',
              borderColor:
                '#b33',
            }}
          >
            CONTRACT NOT CONFIGURED —
            add
            NEXT_PUBLIC_CONTRACT_ADDRESS
            to .env.local, then
            restart Next.js.
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
                setWallet(
                  e.target.value
                )
              }
              placeholder="0x…"
            />

            <label>
              SPECIFICATION
            </label>

            <textarea
              value={spec}
              onChange={(e) =>
                setSpec(
                  e.target.value
                )
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
                    setAmount(
                      e.target.value
                    )
                  }
                />
              </div>

              <button
                className="dark"
                disabled={!can}
                onClick={
                  createJob
                }
              >
                {busy
                  ? 'Processing…'
                  : 'Lock GEN →'}
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
                setJobId(
                  e.target.value
                )
              }
              placeholder="Created automatically"
            />

            <label>
              AGENT RESULT
            </label>

            <textarea
              value={result}
              onChange={(e) =>
                setResult(
                  e.target.value
                )
              }
              rows="15"
            />

            <button
              className="dark full"
              disabled={
                !can ||
                !jobId
              }
              onClick={
                submit
              }
            >
              {busy
                ? 'Processing…'
                : 'Submit work →'}
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

            {job?.status && (
              <div
                style={{
                  marginTop:
                    '14px',
                  marginBottom:
                    '14px',
                  fontSize:
                    '13px',
                }}
              >
                Job status:{' '}
                <strong>
                  {job.status}
                </strong>
              </div>
            )}

            {job?.amount && (
              <div
                style={{
                  marginBottom:
                    '14px',
                  fontSize:
                    '13px',
                }}
              >
                Escrow:{' '}
                <strong>
                  {formatGen(
                    job.amount
                  )}
                </strong>
              </div>
            )}

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
                  : job?.status ===
                    'SUBMITTED'
                  ? '● Ready for adjudication'
                  : '○ Waiting for submitted evidence'}
              </div>
            </div>

            <button
              className="primary full"
              disabled={
                !can ||
                !jobId ||
                String(
                  job?.status ||
                    ''
                ).toUpperCase() !==
                  'SUBMITTED'
              }
              onClick={
                adjudicate
              }
            >
              {busy
                ? 'Adjudicating…'
                : 'Open case →'}
            </button>

            <button
              className="ghost full"
              onClick={() =>
                refresh(jobId)
              }
              disabled={
                busy ||
                !jobId
              }
            >
              Refresh state
            </button>

            {verdict && (
              <div className="verdict">
                <b>
                  {verdict}
                </b>

                <small>
                  {verdict ===
                  'PASS'
                    ? '100% escrow released to seller'
                    : verdict ===
                      'PARTIAL'
                    ? '50% escrow released to seller'
                    : 'Escrow refunded to buyer'}
                </small>
              </div>
            )}
          </div>
        </div>

        {displayJob && (
          <pre className="state">
            {JSON.stringify(
              displayJob,
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
            Autonomous commerce needs
            a court.
          </h2>
        </div>

        <p>
          Smart contracts enforce
          deterministic rules.
          AgentCourt handles the hard
          question:{' '}
          <strong>
            did an agent actually
            satisfy a human-readable
            obligation?
          </strong>{' '}
          GenLayer supplies the
          adjudication layer.
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