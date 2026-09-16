import pytest

from tests.direct.conftest import GEN

USAGE = {"PERSONAL": 5_000, "EDITORIAL": 10_000, "COMMERCIAL": 20_000, "ADS_MERCH": 30_000}
PROMINENCE = {"INCIDENTAL": 5_000, "FEATURED": 10_000, "PRIMARY": 15_000}


@pytest.mark.parametrize("usage", sorted(USAGE))
@pytest.mark.parametrize("prominence", sorted(PROMINENCE))
def test_fee_for_every_usage_and_prominence(lh, usage, prominence):
    base = 10 * GEN
    assert lh.compute_fee(base, usage, prominence) == base * USAGE[usage] * PROMINENCE[prominence] // 100_000_000


def test_fee_example_from_the_spec(lh):
    assert lh.compute_fee(10 * GEN, "ADS_MERCH", "PRIMARY") == 45 * GEN


def test_creator_share_is_97_percent(lh):
    assert lh.creator_share(45 * GEN) == 43_650_000_000_000_000_000


def test_fee_rejects_unknown_category(lh):
    with pytest.raises(KeyError):
        lh.compute_fee(10 * GEN, "NONE", "PRIMARY")


def test_claim_key_joins_work_page_and_image(lh):
    assert lh.claim_key(3, "https://a.example/p", "https://b.example/i.png") == "3|https://a.example/p|https://b.example/i.png"
