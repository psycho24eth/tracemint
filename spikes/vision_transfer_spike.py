# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""Throwaway spike: two-image vision consensus, page rendering, and GEN transfers on Studio Next."""

import json

import genlayer as gl


class VisionTransferSpike(gl.contract.Contract):
    last: str
    forwarded: gl.u256

    def __init__(self):
        self.last = ""
        self.forwarded = 0

    @gl.public.write
    def compare(self, url_a: str, url_b: str) -> None:
        def leader_fn() -> dict:
            first = gl.nondet.web.get(url_a).body
            second = gl.nondet.web.get(url_b).body
            raw = gl.nondet.exec_prompt(
                "Image 1 and image 2 are attached. Do they show the same artwork, allowing for "
                'resizing or cropping? Respond with JSON only: {"same_work": true} or {"same_work": false}',
                images=[first, second],
                response_format="json",
            )
            data = raw if isinstance(raw, dict) else json.loads(str(raw))
            return {"same_work": bool(data.get("same_work"))}

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            return leader_result.calldata["same_work"] == leader_fn()["same_work"]

        result = gl.vm.run_nondet_default(leader_fn, validator_fn)
        self.last = json.dumps(result, sort_keys=True)

    @gl.public.write
    def page_has(self, url: str, needle: str) -> None:
        def check() -> str:
            text = gl.nondet.web.render(url, mode="text")
            return json.dumps({"found": needle.lower() in text.lower()})

        self.last = gl.eq_principle.strict_eq(check)

    @gl.public.write.payable
    def forward(self, to: str) -> None:
        amount = int(gl.message.value)
        self.forwarded = int(self.forwarded) + amount
        self.last = json.dumps({"forwarded": amount})
        gl.chain.Account(gl.Address(to)).emit_transfer(amount, on="finalized")

    @gl.public.view
    def get_last(self) -> str:
        return self.last
