import pytest

from tests.direct.conftest import (
    FOUND_IMAGE_URL,
    GEN,
    PAGE_URL,
    deploy_license_hunter,
    file_claim,
    hex_address,
    mock_evidence,
    mock_verdict,
    register_work,
)


@pytest.fixture
def contract(direct_vm, direct_deploy, direct_owner, direct_alice, direct_charlie):
    deployed = deploy_license_hunter(direct_vm, direct_deploy, direct_owner, direct_charlie)
    register_work(direct_vm, deployed, direct_alice)
    return deployed


def test_unlicensed_copy_issues_a_notice(direct_vm, contract, direct_bob, direct_charlie):
    page = f"Synth hoodie, 40 USD. Pay us in GEN: {hex_address(direct_bob)}"

    claim_id = file_claim(direct_vm, contract, direct_charlie, page_body=page)

    assert claim_id == 1
    claim = contract.get_claim(1)
    assert claim["status"] == "NOTICE_ISSUED"
    assert claim["verdict"] == "COPY_UNLICENSED"
    assert claim["usage"] == "ADS_MERCH"
    assert claim["prominence"] == "PRIMARY"
    assert claim["fee"] == 45 * GEN
    assert claim["wallet_on_page"] == hex_address(direct_bob).lower()
    assert claim["filed_by"] == hex_address(direct_charlie)
    assert claim["page_url"] == PAGE_URL
    assert claim["image_url"] == FOUND_IMAGE_URL
    assert claim["reasoning"] == "Test reasoning."
    assert [c["id"] for c in contract.list_notices()] == [1]
    assert [c["id"] for c in contract.list_claims(1)] == [1]
    assert contract.get_stats()["claims_by_status"]["NOTICE_ISSUED"] == 1


@pytest.mark.parametrize("verdict", ["COPY_LICENSED", "DIFFERENT_WORK", "UNCLEAR"])
def test_other_verdicts_store_a_claim_without_notice(direct_vm, contract, direct_charlie, verdict):
    file_claim(direct_vm, contract, direct_charlie, verdict=verdict, usage="NONE", prominence="NONE")

    claim = contract.get_claim(1)
    assert claim["status"] == "NO_NOTICE"
    assert claim["verdict"] == verdict
    assert claim["fee"] == 0
    assert contract.list_notices() == []


def test_creator_can_file_their_own_claim(direct_vm, contract, direct_alice):
    file_claim(direct_vm, contract, direct_alice)
    assert contract.get_claim(1)["filed_by"] == hex_address(direct_alice)


def test_only_creator_or_agent_can_file(direct_vm, contract, direct_bob):
    with direct_vm.expect_revert("Only the creator or the agent can file claims"):
        file_claim(direct_vm, contract, direct_bob)


def test_duplicate_claim_is_rejected(direct_vm, contract, direct_charlie):
    file_claim(direct_vm, contract, direct_charlie)
    with direct_vm.expect_revert("Claim already filed"):
        file_claim(direct_vm, contract, direct_charlie)


def test_unknown_verdict_reverts(direct_vm, contract, direct_charlie):
    with direct_vm.expect_revert("Unknown verdict"):
        file_claim(direct_vm, contract, direct_charlie, verdict="MAYBE")


def test_missing_image_reverts_with_external_error(direct_vm, contract, direct_charlie):
    direct_vm.clear_mocks()
    mock_evidence(direct_vm, found_status=404)
    mock_verdict(direct_vm, "COPY_UNLICENSED", "ADS_MERCH", "PRIMARY")
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("returned 404"):
        contract.file_claim(1, PAGE_URL, FOUND_IMAGE_URL)


def test_claim_on_unknown_work_reverts(direct_vm, contract, direct_charlie):
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Work not found"):
        contract.file_claim(7, PAGE_URL, FOUND_IMAGE_URL)
