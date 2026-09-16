import pytest

from tests.direct.conftest import (
    GEN,
    PROOF_URL,
    deploy_license_hunter,
    file_claim,
    hex_address,
    mock_evidence,
    mock_verdict,
    register_work,
)

FEE = 45 * GEN
PERMISSION_LETTER = "PERMISSION LETTER: Demo Creator licenses Cybernetic Horizon to Demo Shop."


@pytest.fixture
def contract(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    """Alice's work has an open 45 GEN notice addressed to Bob's wallet. Charlie is the agent."""
    deployed = deploy_license_hunter(direct_vm, direct_deploy, direct_owner, direct_charlie)
    register_work(direct_vm, deployed, direct_alice)
    file_claim(direct_vm, deployed, direct_charlie, page_body=f"Pay us in GEN: {hex_address(direct_bob)}")
    return deployed


def dispute(vm, contract, sender, verdict, usage="NONE", prominence="NONE", proof_url=PROOF_URL):
    vm.clear_mocks()
    mock_evidence(vm, page_body="Synth hoodie for sale", proof_body=PERMISSION_LETTER)
    mock_verdict(vm, verdict, usage, prominence, reasoning="Proof reviewed.")
    vm.sender = sender
    return contract.dispute(1, proof_url)


def test_valid_proof_withdraws_the_notice(direct_vm, contract, direct_bob):
    assert dispute(direct_vm, contract, direct_bob, "COPY_LICENSED") == "WITHDRAWN"

    claim = contract.get_claim(1)
    assert claim["status"] == "WITHDRAWN"
    assert claim["dispute_proof_url"] == PROOF_URL
    assert claim["reasoning"] == "Proof reviewed."

    direct_vm.sender = direct_bob
    direct_vm.value = FEE
    with direct_vm.expect_revert("This notice is not payable"):
        contract.pay_license(1)
    direct_vm.value = 0


def test_rejected_dispute_keeps_the_notice_payable(direct_vm, contract, direct_bob):
    assert dispute(direct_vm, contract, direct_bob, "COPY_UNLICENSED", "ADS_MERCH", "PRIMARY") == "DISPUTE_REJECTED"

    direct_vm.sender = direct_bob
    direct_vm.deal(direct_bob, 1_000 * GEN)
    direct_vm.value = FEE
    assert contract.pay_license(1) == 1
    direct_vm.value = 0
    assert contract.get_claim(1)["status"] == "PAID"


def test_only_the_wallet_on_the_page_can_dispute(direct_vm, contract, direct_alice):
    with direct_vm.expect_revert("Only the wallet shown on the page can dispute"):
        dispute(direct_vm, contract, direct_alice, "COPY_LICENSED")


def test_a_notice_can_be_disputed_once(direct_vm, contract, direct_bob):
    dispute(direct_vm, contract, direct_bob, "COPY_UNLICENSED", "ADS_MERCH", "PRIMARY")
    with direct_vm.expect_revert("Only an open notice can be disputed"):
        dispute(direct_vm, contract, direct_bob, "COPY_LICENSED")


def test_dispute_requires_an_https_proof(direct_vm, contract, direct_bob):
    with direct_vm.expect_revert("URLs must start with https://"):
        dispute(direct_vm, contract, direct_bob, "COPY_LICENSED", proof_url="http://shop.example.com/permission-letter")


def test_anyone_can_dispute_when_the_page_shows_no_wallet(
    direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie
):
    deployed = deploy_license_hunter(direct_vm, direct_deploy, direct_owner, direct_charlie)
    register_work(direct_vm, deployed, direct_alice)
    file_claim(direct_vm, deployed, direct_charlie, page_body="Synth hoodie, no wallet listed")
    assert dispute(direct_vm, deployed, direct_bob, "COPY_LICENSED") == "WITHDRAWN"
