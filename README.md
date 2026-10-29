# Competitor Analysis AI Agent

FastAPI application for discovering, reviewing, and comparing competitor candidates using public-source evidence. Search results remain unverified and pending until a user explicitly approves them. Missing information is reported as unavailable, not zero.

## Install and run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000`. The frontend and API are served from the same origin; the application does not enable cross-origin access by default.

## Configuration

Configuration is read from the server process environment. The checked-in `.env.example` lists supported variables but is not automatically loaded by the application.

- Public DDGS search is the default and does not require a key.
- Brave Search is optional; set `COMPANY_SEARCH_PROVIDER=brave` and `BRAVE_SEARCH_API_KEY`.
- PageSpeed Insights is optional and can run without a key, subject to Google's quota; `PAGESPEED_API_KEY` is optional.
- AI-assisted intent/insight selection is optional; configure `INSIGHTS_API_URL`, `INSIGHTS_MODEL`, and, when needed, `INSIGHTS_API_KEY`.
- `COMPETITOR_STORE_PATH` optionally selects a local JSON store. Otherwise records are stored in `backend/data/competitors.json`.

Keep provider keys in the server environment. Do not expose them in frontend code, reports, logs, or source control. Website analysis only requests public HTTP(S) pages and rejects non-public addresses and unsafe redirects.

## Evidence and exports

The comparison dashboard and downloadable PDF/CSV reports are generated from approved local records and their stored evidence. Reports include collection timestamps, sources, missing-data explanations, and limitations; they do not fill unknown values or fabricate competitor details. A PDF is generated with ReportLab when requested.

## Tests

```powershell
python -m pip install pytest
python -m pytest -q
```
