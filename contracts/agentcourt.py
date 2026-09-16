# { "Depends": "py-genlayer:9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0" }
from genlayer import *
import json


@gl.evm.contract_interface
class Recipient:
    class View:
        pass

    class Write:
        pass


class AgentCourt(gl.Contract):
    next_job_id: u256
    buyers: TreeMap[u256, Address]
    sellers: TreeMap[u256, Address]
    amounts: TreeMap[u256, u256]
    specs: TreeMap[u256, str]
    submissions: TreeMap[u256, str]
    statuses: TreeMap[u256, str]
    verdicts: TreeMap[u256, str]

    def __init__(self):
        self.next_job_id = u256(1)

    @gl.public.write.payable
    def create_job(self, seller: str, specification: str) -> u256:
        amount = gl.message.value

        if amount == u256(0):
            raise gl.vm.UserError("Escrow must contain GEN")

        job_id = self.next_job_id
        self.next_job_id = self.next_job_id + u256(1)

        self.buyers[job_id] = gl.message.sender_address
        self.sellers[job_id] = Address(seller)
        self.amounts[job_id] = amount
        self.specs[job_id] = specification
        self.submissions[job_id] = ""
        self.statuses[job_id] = "OPEN"
        self.verdicts[job_id] = ""

        return job_id

    @gl.public.write
    def submit(self, job_id: u256, result: str):
        if self.statuses[job_id] != "OPEN":
            raise gl.vm.UserError("Job is not open")

        if gl.message.sender_address != self.sellers[job_id]:
            raise gl.vm.UserError("Only the seller can submit")

        if result.strip() == "":
            raise gl.vm.UserError("Submission cannot be empty")

        self.submissions[job_id] = result
        self.statuses[job_id] = "SUBMITTED"

    @gl.public.write
    def adjudicate(self, job_id: u256) -> str:
        if self.statuses[job_id] != "SUBMITTED":
            raise gl.vm.UserError("Nothing to adjudicate")

        specification = self.specs[job_id]
        submission = self.submissions[job_id]

        def evaluate():
            prompt = f"""
You are the autonomous judge for AgentCourt, a dispute-resolution protocol
for AI-agent commerce.

Your job is to decide whether the seller's submission satisfies the buyer's
natural-language agreement.

CONTRACT REQUIREMENTS:
{specification}

SELLER SUBMISSION:
{submission}

Return ONLY valid JSON in exactly this structure:

{{"verdict":"PASS"}}

or

{{"verdict":"PARTIAL"}}

or

{{"verdict":"FAIL"}}

Decision rules:

PASS:
The seller substantially satisfies all important requirements.

PARTIAL:
The seller completed meaningful work, but one or more important requirements
are missing, incomplete, or materially defective.

FAIL:
The seller did not substantially satisfy the agreement.

Do not return explanations.
Do not return markdown.
Do not return any field other than "verdict".
"""

            raw = gl.nondet.exec_prompt(prompt)

            raw = raw.replace("```json", "")
            raw = raw.replace("```", "")
            raw = raw.strip()

            data = json.loads(raw)

            verdict = str(data["verdict"]).upper()

            if verdict not in ["PASS", "PARTIAL", "FAIL"]:
                raise gl.vm.UserError("Invalid verdict")

            return verdict

        verdict = gl.eq_principle.prompt_comparative(
            evaluate,
            principle="""
The validators must agree on the final verdict.

The verdict must be exactly one of:
PASS, PARTIAL, FAIL.

PASS means the seller substantially satisfied the contract requirements.

PARTIAL means meaningful work was delivered but important requirements
are missing or incomplete.

FAIL means the seller did not substantially satisfy the contract.

Ignore differences in wording or formatting. Compare only the substantive
verdict and whether it is justified by the contract requirements and seller
submission.
"""
        )

        verdict = str(verdict).upper().strip()

        if verdict not in ["PASS", "PARTIAL", "FAIL"]:
            raise gl.vm.UserError("Invalid adjudication result")

        self.verdicts[job_id] = verdict
        self.statuses[job_id] = "RESOLVED"

        amount = self.amounts[job_id]

        payout = u256(0)

        if verdict == "PASS":
            payout = amount

        elif verdict == "PARTIAL":
            payout = amount // u256(2)

        elif verdict == "FAIL":
            payout = u256(0)

        refund = amount - payout

        # Pay seller
        if payout > u256(0):
            Recipient(
                self.sellers[job_id]
            ).emit_transfer(
                value=payout
            )

        # Refund buyer
        if refund > u256(0):
            Recipient(
                self.buyers[job_id]
            ).emit_transfer(
                value=refund
            )

        return verdict

    @gl.public.view
    def get_job(self, job_id: u256) -> TreeMap[str, str]:
        return {
            "buyer": str(self.buyers[job_id]),
            "seller": str(self.sellers[job_id]),
            "amount": str(self.amounts[job_id]),
            "specification": self.specs[job_id],
            "submission": self.submissions[job_id],
            "status": self.statuses[job_id],
            "verdict": self.verdicts[job_id],
        }