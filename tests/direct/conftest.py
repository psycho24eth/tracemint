"""Shared helpers for LicenseHunter direct-mode tests."""

import json
import sys

import pytest
from eth_utils import to_checksum_address

CONTRACT = "contracts/license_hunter.py"
GEN = 10**18

IMAGE_URL = "https://art.example.com/cybernetic-horizon.png"
PORTFOLIO_URL = "https://portfolio.example.com/demo-creator"
PAGE_URL = "https://shop.example.com/products/hoodie"
FOUND_IMAGE_URL = "https://cdn.example.com/hoodie-banner.png"
PROOF_URL = "https://shop.example.com/permission-letter"
JUDGE_PROMPT = r"impartial reviewer for LicenseHunter"


def hex_address(addr) -> str:
    """Checksummed hex for a test address, matching Address.as_hex inside the contract."""
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    if isinstance(addr, str):
        return to_checksum_address(addr)
    return to_checksum_address(bytes(addr))


def mock_json_llm(vm, prompt_pattern, response):
    """Register JSON at the direct runner's raw text response boundary (template helper)."""
    vm.mock_llm(prompt_pattern, json.dumps(json.dumps(response)))


def deploy_license_hunter(vm, direct_deploy, owner, agent):
    vm.sender = owner
    return direct_deploy(CONTRACT, hex_address(agent))


def register_work(vm, contract, creator, base_price=10 * GEN, watch_urls=None, portfolio_body=None):
    vm.sender = creator
    body = portfolio_body if portfolio_body is not None else f"Demo Creator portfolio. Wallet: {hex_address(creator)}"
    vm.mock_web(r"portfolio\.example\.com", {"status": 200, "body": body})
    return contract.register_work(
        "Cybernetic Horizon",
        IMAGE_URL,
        PORTFOLIO_URL,
        base_price,
        "Non-exclusive web license, 12 months",
        [PAGE_URL] if watch_urls is None else watch_urls,
    )


@pytest.fixture
def lh(direct_vm, direct_deploy, direct_owner, direct_charlie):
    """The contract module as gltest loaded it, for testing pure helper functions directly."""
    deploy_license_hunter(direct_vm, direct_deploy, direct_owner, direct_charlie)
    return sys.modules["_contract_license_hunter"]
