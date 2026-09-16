import pytest

from tests.direct.conftest import GEN, PAGE_URL, deploy_license_hunter, file_claim, hex_address, register_work

LICENSE_SECONDS = 31_536_000
FEE = 45 * GEN
CREATOR_AMOUNT = 43_650_000_000_000_000_000
PROTOCOL_AMOUNT = 1_350_000_000_000_000_000


@pytest.fixture
def contract(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    """Alice's work has an open 45 GEN notice addressed to Bob's wallet. Charlie is the agent."""
    deployed = deploy_license_hunter(direct_vm, direct_deploy, direct_owner, direct_charlie)
    register_work(direct_vm, deployed, direct_alice)
    file_claim(direct_vm, deployed, direct_charlie, page_body=f"Pay us in GEN: {hex_address(direct_bob)}")
    return deployed


def pay(vm, contract, payer, amount, claim_id=1):
    vm.sender = payer
    vm.deal(payer, 1_000 * GEN)
    vm.value = amount
    try:
        return contract.pay_license(claim_id)
    finally:
        vm.value = 0


def test_exact_payment_issues_license_and_credits_creator(direct_vm, contract, direct_alice, direct_bob):
    license_id = pay(direct_vm, contract, direct_bob, FEE)

    assert license_id == 1
    lic = contract.get_license(1)
    assert lic["claim_id"] == 1
    assert lic["work_id"] == 1
    assert lic["licensee"] == hex_address(direct_bob)
    assert lic["page_url"] == PAGE_URL
    assert lic["amount"] == FEE
    assert lic["creator_amount"] == CREATOR_AMOUNT
    assert lic["expires_at"] - lic["issued_at"] == LICENSE_SECONDS
    assert contract.get_claim(1)["status"] == "PAID"
    assert contract.get_earnings(hex_address(direct_alice)) == CREATOR_AMOUNT
    stats = contract.get_stats()
    assert stats["protocol_balance"] == PROTOCOL_AMOUNT
    assert stats["total_license_revenue"] == FEE
    assert stats["licenses"] == 1
    assert [item["id"] for item in contract.list_licenses(hex_address(direct_bob))] == [1]
    assert contract.list_licenses(hex_address(direct_alice)) == []


def test_wrong_amount_is_rejected(direct_vm, contract, direct_bob):
    with direct_vm.expect_revert("Send exactly"):
        pay(direct_vm, contract, direct_bob, FEE - 1)


def test_paying_twice_is_rejected(direct_vm, contract, direct_bob):
    pay(direct_vm, contract, direct_bob, FEE)
    with direct_vm.expect_revert("This notice is not payable"):
        pay(direct_vm, contract, direct_bob, FEE)


def test_claim_without_notice_is_not_payable(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    deployed = deploy_license_hunter(direct_vm, direct_deploy, direct_owner, direct_charlie)
    register_work(direct_vm, deployed, direct_alice)
    file_claim(direct_vm, deployed, direct_charlie, verdict="COPY_LICENSED", usage="NONE", prominence="NONE")
    with direct_vm.expect_revert("This notice is not payable"):
        pay(direct_vm, deployed, direct_bob, 0)


def test_withdraw_earnings_requires_a_balance(direct_vm, contract, direct_bob):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("No earnings to withdraw"):
        contract.withdraw_earnings()


def test_withdraw_protocol_fees_is_owner_only(direct_vm, contract, direct_alice, direct_bob):
    pay(direct_vm, contract, direct_bob, FEE)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Only the owner can withdraw protocol fees"):
        contract.withdraw_protocol_fees(hex_address(direct_alice))


def test_withdraw_protocol_fees_requires_a_balance(direct_vm, contract, direct_owner):
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("No protocol fees to withdraw"):
        contract.withdraw_protocol_fees(hex_address(direct_owner))
