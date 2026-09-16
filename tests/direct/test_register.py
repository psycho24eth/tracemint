import pytest

from tests.direct.conftest import (
    GEN,
    IMAGE_URL,
    PAGE_URL,
    PORTFOLIO_URL,
    deploy_license_hunter,
    hex_address,
    register_work,
)


@pytest.fixture
def contract(direct_vm, direct_deploy, direct_owner, direct_charlie):
    return deploy_license_hunter(direct_vm, direct_deploy, direct_owner, direct_charlie)


def test_register_work_stores_the_work(direct_vm, contract, direct_alice):
    work_id = register_work(direct_vm, contract, direct_alice)

    assert work_id == 1
    work = contract.get_work(1)
    assert work["id"] == 1
    assert work["creator"] == hex_address(direct_alice)
    assert work["title"] == "Cybernetic Horizon"
    assert work["image_url"] == IMAGE_URL
    assert work["portfolio_url"] == PORTFOLIO_URL
    assert work["base_price"] == 10 * GEN
    assert work["terms"] == "Non-exclusive web license, 12 months"
    assert work["watch_urls"] == [PAGE_URL]
    assert work["created_at"] > 0
    assert [w["id"] for w in contract.list_works()] == [1]


def test_register_work_finds_wallet_case_insensitively(direct_vm, contract, direct_alice):
    body = f"wallet {hex_address(direct_alice).lower()}"
    assert register_work(direct_vm, contract, direct_alice, portfolio_body=body) == 1


def test_register_work_requires_wallet_on_portfolio(direct_vm, contract, direct_alice):
    with direct_vm.expect_revert("Wallet address not found on portfolio page"):
        register_work(direct_vm, contract, direct_alice, portfolio_body="A portfolio without any wallet")


VALID = {
    "title": "Cybernetic Horizon",
    "image_url": IMAGE_URL,
    "portfolio_url": PORTFOLIO_URL,
    "base_price": 10 * GEN,
    "terms": "Web license",
    "watch_urls": [PAGE_URL],
}


@pytest.mark.parametrize(
    "override,message",
    [
        ({"title": "   "}, "Title must be 1 to 120 characters"),
        ({"title": "x" * 121}, "Title must be 1 to 120 characters"),
        ({"image_url": "http://art.example.com/a.png"}, "URLs must start with https://"),
        ({"portfolio_url": "portfolio.example.com"}, "URLs must start with https://"),
        ({"base_price": 0}, "Base price must be greater than zero"),
        ({"terms": "t" * 501}, "Terms must be at most 500 characters"),
        ({"watch_urls": [f"https://site{i}.example.com" for i in range(11)]}, "At most 10 watched URLs"),
        ({"watch_urls": ["ftp://files.example.com"]}, "URLs must start with https://"),
    ],
)
def test_register_work_validates_input(direct_vm, contract, direct_alice, override, message):
    args = {**VALID, **override}
    direct_vm.sender = direct_alice
    direct_vm.mock_web(r"portfolio\.example\.com", {"status": 200, "body": hex_address(direct_alice)})
    with direct_vm.expect_revert(message):
        contract.register_work(
            args["title"],
            args["image_url"],
            args["portfolio_url"],
            args["base_price"],
            args["terms"],
            args["watch_urls"],
        )


def test_get_work_unknown_id_reverts(direct_vm, contract):
    with direct_vm.expect_revert("Work not found"):
        contract.get_work(99)


def test_update_watchlist_only_by_creator(direct_vm, contract, direct_alice, direct_bob):
    register_work(direct_vm, contract, direct_alice)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the creator can update the watchlist"):
        contract.update_watchlist(1, ["https://other.example.com/page"])

    direct_vm.sender = direct_alice
    contract.update_watchlist(1, ["https://other.example.com/page"])
    assert contract.get_work(1)["watch_urls"] == ["https://other.example.com/page"]


def test_set_agent_only_by_owner(direct_vm, contract, direct_owner, direct_alice, direct_charlie):
    assert contract.get_stats()["agent"] == hex_address(direct_charlie)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Only the owner can change the agent"):
        contract.set_agent(hex_address(direct_alice))

    direct_vm.sender = direct_owner
    contract.set_agent(hex_address(direct_alice))
    assert contract.get_stats()["agent"] == hex_address(direct_alice)


def test_stats_start_empty(contract, direct_owner, direct_alice):
    stats = contract.get_stats()
    assert stats["owner"] == hex_address(direct_owner)
    assert stats["works"] == 0
    assert stats["claims"] == 0
    assert stats["licenses"] == 0
    assert stats["protocol_balance"] == 0
    assert stats["total_license_revenue"] == 0
    assert contract.get_earnings(hex_address(direct_alice)) == 0
