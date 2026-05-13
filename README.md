# Personal Finance Prototype

A single-file, front-end-only net worth tracking prototype built with HTML, CSS, and vanilla JavaScript. It replaces the old arcade game with a static personal finance dashboard that uses fake, anonymized data only.

## What is in the app?

- Net worth summary cards, a six-month trend chart, and an account table
- Business prototype tab with fake P&L rows and valuation metrics
- Loans tab with mock balances, payments, and amortization preview rows
- Tax & Docs checklist with a simple front-end search box
- Data Notes tab documenting safe prototype boundaries and future table ideas

## Run it locally

Serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000/>.

You can also open `index.html` directly in a browser.

## Safety note

Do not put real account balances, tax documents, client details, household data, API keys, or secrets in this prototype. It is intentionally static so it can be safely used for UI and feature prototyping before any private database or authentication layer exists.
