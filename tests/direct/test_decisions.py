import pytest

FENCE = "`" * 3
WALLET = "0x" + "ab" * 20


def decision(verdict="COPY_UNLICENSED", usage="ADS_MERCH", prominence="PRIMARY", wallet=""):
    return {"verdict": verdict, "usage": usage, "prominence": prominence, "reasoning": "any", "wallet_on_page": wallet}


def test_normalize_accepts_fenced_lowercase_json(lh):
    raw = FENCE + 'json\n{"verdict": "copy_unlicensed", "usage": "ads_merch", "prominence": "primary", "reasoning": "Same artwork."}\n' + FENCE
    assert lh.normalize_judgment(raw, f"Pay us in GEN: {WALLET}") == {
        "verdict": "COPY_UNLICENSED",
        "usage": "ADS_MERCH",
        "prominence": "PRIMARY",
        "reasoning": "Same artwork.",
        "wallet_on_page": WALLET,
    }


def test_normalize_sets_none_when_not_an_unlicensed_copy(lh):
    raw = {"verdict": "COPY_LICENSED", "usage": "ADS_MERCH", "prominence": "PRIMARY", "reasoning": "Credited."}
    result = lh.normalize_judgment(raw, "no wallet on this page")
    assert result["usage"] == "NONE"
    assert result["prominence"] == "NONE"
    assert result["wallet_on_page"] == ""


def test_normalize_truncates_reasoning(lh):
    result = lh.normalize_judgment({"verdict": "UNCLEAR", "reasoning": "x" * 5000}, "")
    assert len(result["reasoning"]) == 600


@pytest.mark.parametrize(
    "raw,fragment",
    [
        ("not json at all", "[LLM_ERROR] Model did not return JSON"),
        ({"verdict": "MAYBE"}, "[LLM_ERROR] Unknown verdict"),
        ({"verdict": "COPY_UNLICENSED", "usage": "SOMETHING", "prominence": "PRIMARY"}, "[LLM_ERROR] Unknown usage"),
        ({"verdict": "COPY_UNLICENSED", "usage": "EDITORIAL", "prominence": "HUGE"}, "[LLM_ERROR] Unknown prominence"),
    ],
)
def test_normalize_rejects_bad_model_output(lh, raw, fragment):
    with pytest.raises(lh.gl.vm.UserError) as excinfo:
        lh.normalize_judgment(raw, "")
    assert fragment in lh.error_text(excinfo.value)


def test_decisions_match_ignores_reasoning(lh):
    assert lh.decisions_match(decision(), {**decision(), "reasoning": "different words"}) is True


@pytest.mark.parametrize(
    "field,value",
    [("verdict", "COPY_LICENSED"), ("usage", "EDITORIAL"), ("prominence", "FEATURED"), ("wallet_on_page", WALLET)],
)
def test_decisions_differ_on_any_decision_field(lh, field, value):
    assert lh.decisions_match({**decision(), field: value}, decision()) is False


def test_decisions_ignore_usage_for_other_verdicts(lh):
    leader = decision(verdict="DIFFERENT_WORK", usage="NONE", prominence="NONE")
    assert lh.decisions_match(leader, dict(leader)) is True


def test_decisions_reject_non_dict_leader(lh):
    assert lh.decisions_match("not a dict", decision()) is False


@pytest.mark.parametrize(
    "leader,mine,expected",
    [
        ("[EXPECTED] Work not found", "[EXPECTED] Work not found", True),
        ("[EXPECTED] Work not found", "[EXPECTED] Claim not found", False),
        ("[EXTERNAL] https://x returned 404", "[EXTERNAL] https://x returned 404", True),
        ("[TRANSIENT] Could not load https://x", "[TRANSIENT] https://x returned 503", True),
        ("[LLM_ERROR] Model did not return JSON", "[LLM_ERROR] Model did not return JSON", False),
        ("[TRANSIENT] Could not load https://x", "[EXTERNAL] https://x returned 404", False),
    ],
)
def test_errors_agree(lh, leader, mine, expected):
    assert lh.errors_agree(leader, mine) is expected
