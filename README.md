# LicenseHunter

LicenseHunter lets creators register images they own, finds copies on the web, and lets GenLayer validators decide whether a copy is unlicensed. A confirmed copy gets an onchain notice with a fee. Paying it issues a 12-month license and credits the creator.

Status: rebuilding on GenLayer Studio Next. Design: `docs/superpowers/specs/2026-09-15-licensehunter-genlayer-design.md`.

## Develop

Requirements: Node 22+, Python 3.12, and [uv](https://docs.astral.sh/uv/).

```bash
npm install
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt   # macOS/Linux: .venv/bin/python
PYTHONUTF8=1 .venv/Scripts/genvm-lint.exe check contracts/*.py
.venv/Scripts/python.exe -m pytest tests/direct -v
npm test --workspace frontend
```

Built on GenLayer's project boilerplate (`v2-dev` branch, commit `816f3b8`), MIT licensed.
