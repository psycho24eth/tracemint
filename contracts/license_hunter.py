# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""LicenseHunter: GenLayer validators decide whether an image found online is an
unlicensed copy of a registered work. A confirmed copy gets a notice with a fee;
paying it issues a license and credits the creator."""

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone

import genlayer as gl
from genlayer.storage import allow as allow_storage

BPS = 10_000
PROTOCOL_FEE_BPS = 300
LICENSE_SECONDS = 31_536_000
MAX_WATCH_URLS = 10
MAX_URL_CHARS = 2_000
MAX_TITLE_CHARS = 120
MAX_TERMS_CHARS = 500
MAX_PAGE_CHARS = 4_000
MAX_PORTFOLIO_CHARS = 50_000
MAX_IMAGE_BYTES = 5_000_000
MAX_REASONING_CHARS = 600

USAGE_BPS = {"PERSONAL": 5_000, "EDITORIAL": 10_000, "COMMERCIAL": 20_000, "ADS_MERCH": 30_000}
PROMINENCE_BPS = {"INCIDENTAL": 5_000, "FEATURED": 10_000, "PRIMARY": 15_000}
VERDICTS = ("COPY_UNLICENSED", "COPY_LICENSED", "DIFFERENT_WORK", "UNCLEAR")
NOTICE_STATUSES = ("NOTICE_ISSUED", "DISPUTE_REJECTED", "PAID", "WITHDRAWN")
CLAIM_STATUSES = ("NOTICE_ISSUED", "NO_NOTICE", "PAID", "WITHDRAWN", "DISPUTE_REJECTED")

ERR_EXPECTED = "[EXPECTED]"
ERR_EXTERNAL = "[EXTERNAL]"
ERR_TRANSIENT = "[TRANSIENT]"
ERR_LLM = "[LLM_ERROR]"

WALLET_PATTERN = re.compile(r"0x[0-9a-fA-F]{40}")


@allow_storage
@dataclass
class Work:
    id: gl.u256
    creator: gl.Address
    title: str
    image_url: str
    portfolio_url: str
    base_price: gl.u256
    terms: str
    watch_urls: str  # JSON array of URLs
    created_at: gl.u256


@allow_storage
@dataclass
class Claim:
    id: gl.u256
    work_id: gl.u256
    page_url: str
    image_url: str
    filed_by: gl.Address
    verdict: str
    usage: str
    prominence: str
    reasoning: str
    wallet_on_page: str
    fee: gl.u256
    status: str
    dispute_proof_url: str
    created_at: gl.u256


@allow_storage
@dataclass
class License:
    id: gl.u256
    claim_id: gl.u256
    work_id: gl.u256
    licensee: gl.Address
    page_url: str
    amount: gl.u256
    creator_amount: gl.u256
    issued_at: gl.u256
    expires_at: gl.u256


def now_ts() -> int:
    # GenVM pins datetime.now() to the transaction timestamp, so every validator sees the same value.
    return int(datetime.now(timezone.utc).timestamp())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise gl.vm.UserError(f"{ERR_EXPECTED} {message}")


def is_https_url(url: str) -> bool:
    return isinstance(url, str) and url.startswith("https://") and len(url) <= MAX_URL_CHARS and " " not in url


def validate_watch_urls(watch_urls: list) -> str:
    require(len(watch_urls) <= MAX_WATCH_URLS, f"At most {MAX_WATCH_URLS} watched URLs")
    for url in watch_urls:
        require(is_https_url(url), "URLs must start with https://")
    return json.dumps(list(watch_urls))


def fetch_text(url: str, limit: int) -> str:
    try:
        text = gl.nondet.web.render(url, mode="text")
    except Exception:
        raise gl.vm.UserError(f"{ERR_TRANSIENT} Could not load {url}")
    return (text or "")[:limit]


def work_to_dict(work: Work) -> dict:
    return {
        "id": int(work.id),
        "creator": work.creator.as_hex,
        "title": work.title,
        "image_url": work.image_url,
        "portfolio_url": work.portfolio_url,
        "base_price": int(work.base_price),
        "terms": work.terms,
        "watch_urls": json.loads(work.watch_urls),
        "created_at": int(work.created_at),
    }


def claim_to_dict(claim: Claim) -> dict:
    return {
        "id": int(claim.id),
        "work_id": int(claim.work_id),
        "page_url": claim.page_url,
        "image_url": claim.image_url,
        "filed_by": claim.filed_by.as_hex,
        "verdict": claim.verdict,
        "usage": claim.usage,
        "prominence": claim.prominence,
        "reasoning": claim.reasoning,
        "wallet_on_page": claim.wallet_on_page,
        "fee": int(claim.fee),
        "status": claim.status,
        "dispute_proof_url": claim.dispute_proof_url,
        "created_at": int(claim.created_at),
    }


def license_to_dict(lic: License) -> dict:
    return {
        "id": int(lic.id),
        "claim_id": int(lic.claim_id),
        "work_id": int(lic.work_id),
        "licensee": lic.licensee.as_hex,
        "page_url": lic.page_url,
        "amount": int(lic.amount),
        "creator_amount": int(lic.creator_amount),
        "issued_at": int(lic.issued_at),
        "expires_at": int(lic.expires_at),
    }


# Judgment helpers


class LicenseHunter(gl.contract.Contract):
    owner: gl.Address
    agent: gl.Address
    next_work_id: gl.u256
    next_claim_id: gl.u256
    next_license_id: gl.u256
    protocol_balance: gl.u256
    works: gl.storage.TreeMap[gl.u256, Work]
    claims: gl.storage.TreeMap[gl.u256, Claim]
    licenses: gl.storage.TreeMap[gl.u256, License]
    claim_keys: gl.storage.TreeMap[str, gl.u256]
    creator_balances: gl.storage.TreeMap[gl.Address, gl.u256]

    def __init__(self, agent: str):
        self.owner = gl.message.sender_address
        self.agent = gl.Address(agent)
        self.next_work_id = 1
        self.next_claim_id = 1
        self.next_license_id = 1
        self.protocol_balance = 0

    # Admin

    @gl.public.write
    def set_agent(self, agent: str) -> None:
        require(gl.message.sender_address == self.owner, "Only the owner can change the agent")
        self.agent = gl.Address(agent)

    # Works

    @gl.public.write
    def register_work(
        self,
        title: str,
        image_url: str,
        portfolio_url: str,
        base_price: int,
        terms: str,
        watch_urls: list[str],
    ) -> int:
        title = title.strip()
        require(1 <= len(title) <= MAX_TITLE_CHARS, f"Title must be 1 to {MAX_TITLE_CHARS} characters")
        require(is_https_url(image_url) and is_https_url(portfolio_url), "URLs must start with https://")
        require(base_price > 0, "Base price must be greater than zero")
        require(len(terms) <= MAX_TERMS_CHARS, f"Terms must be at most {MAX_TERMS_CHARS} characters")
        watch_json = validate_watch_urls(watch_urls)
        creator = gl.message.sender_address
        self._verify_portfolio(portfolio_url, creator.as_hex)

        work_id = int(self.next_work_id)
        self.next_work_id = work_id + 1
        self.works[work_id] = Work(
            id=work_id,
            creator=creator,
            title=title,
            image_url=image_url,
            portfolio_url=portfolio_url,
            base_price=base_price,
            terms=terms,
            watch_urls=watch_json,
            created_at=now_ts(),
        )
        return work_id

    @gl.public.write
    def update_watchlist(self, work_id: int, watch_urls: list[str]) -> None:
        work = self._get_work(work_id)
        require(gl.message.sender_address == work.creator, "Only the creator can update the watchlist")
        work.watch_urls = validate_watch_urls(watch_urls)

    # Claims

    # Payments

    # Disputes

    # Views

    @gl.public.view
    def get_work(self, work_id: int) -> dict:
        return work_to_dict(self._get_work(work_id))

    @gl.public.view
    def list_works(self) -> list:
        return [work_to_dict(work) for _, work in self.works.items()]

    @gl.public.view
    def get_earnings(self, creator: str) -> int:
        return int(self.creator_balances.get(gl.Address(creator), 0))

    @gl.public.view
    def get_stats(self) -> dict:
        by_status = {status: 0 for status in CLAIM_STATUSES}
        for _, claim in self.claims.items():
            by_status[claim.status] = by_status.get(claim.status, 0) + 1
        revenue = 0
        for _, lic in self.licenses.items():
            revenue += int(lic.amount)
        return {
            "owner": self.owner.as_hex,
            "agent": self.agent.as_hex,
            "works": int(self.next_work_id) - 1,
            "claims": int(self.next_claim_id) - 1,
            "licenses": int(self.next_license_id) - 1,
            "claims_by_status": by_status,
            "total_license_revenue": revenue,
            "protocol_balance": int(self.protocol_balance),
        }

    # Internal

    def _get_work(self, work_id: int) -> Work:
        require(work_id in self.works, "Work not found")
        return self.works[work_id]

    def _verify_portfolio(self, portfolio_url: str, wallet_hex: str) -> None:
        needle = wallet_hex.lower()

        def check() -> str:
            page = fetch_text(portfolio_url, MAX_PORTFOLIO_CHARS)
            return json.dumps({"found": needle in page.lower()})

        result = json.loads(gl.eq_principle.strict_eq(check))
        require(result["found"], "Wallet address not found on portfolio page")
