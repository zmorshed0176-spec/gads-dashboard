# Google Ads Dashboard

A Next.js dashboard that reads raw Google Ads data from a Google Sheet. It shows:

- Five account scorecards (Cost, Purchases, Revenue, CPA, ROAS), each compared with the previous period.
- An **Account Total** table followed by one table per campaign. Each table shows PREV, CURR and % DIFF.
- Last 7, 14 and 30 days presets, plus a custom date range. The selected range is kept in the URL, so links can be shared.

Campaigns come straight from the sheet, so new or renamed campaigns appear on their own with no code change.

## One-click deploy (any GitHub / Vercel account)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzmorshed0176-spec%2Fgads-dashboard&project-name=gads-dashboard&repository-name=gads-dashboard&env=SHEET_URL&envDescription=Browser%20URL%20of%20the%20Google%20Sheet%20tab%20with%20the%20data%20(shared%20as%20Anyone%20with%20the%20link%20%E2%86%92%20Viewer)&envLink=https%3A%2F%2Fgithub.com%2Fzmorshed0176-spec%2Fgads-dashboard%23sheet-format)

Clicking the button:

1. Asks you to sign in to Vercel with **your own** GitHub, GitLab or Bitbucket account.
2. Creates a copy of this repo in **your** account.
3. Asks for `SHEET_URL`. Paste the browser URL of your sheet tab, shared as *Anyone with the link → Viewer*.
4. Deploys the dashboard. Every later push to your copy redeploys it.

Nothing in the code is tied to a particular account. To point a deployment at a different sheet, change `SHEET_URL` in Vercel → Settings → Environment Variables, then redeploy.

## Sheet format

One row per campaign per day. Column order doesn't matter, and the header names are flexible: case, spaces, underscores and anything in brackets are ignored.

| Field | Accepted header names (examples) |
|---|---|
| Date | `date`, `day` |
| Campaign | `campaign`, `campaign name` |
| Cost | `cost`, `spend` (or `cost_micros`) |
| Purchases | `conversion`, `conversions`, `purchases` |
| Revenue | `conversion value`, `conv value`, `revenue` |
| Impressions | `impr`, `impressions` |
| Clicks | `clicks` |
| Currency (optional) | `currency`, `currency code` |

Every other metric is calculated from these columns: ROAS, CPC, CPA, CVR, AOV, CTR and CPM. To change which rows appear, or their order, edit `METRICS` in `lib/metrics.ts`. To change the scorecards, edit `SCORECARDS` in the same file.

**Currency** is chosen in this order: a `currency` column in the sheet, then a code in a header such as `Cost (AUD)`, then the `CURRENCY` env var, then AUD.

**Dates:** "Last N days" ends on the most recent complete day in the sheet. Today is excluded because its data is partial. The previous period is the same number of days immediately before the selected range.

## Deploy (GitHub + Vercel)

1. In Google Sheets, set **Share → General access** to *Anyone with the link → Viewer*.
2. Open the tab that holds the data and copy the browser URL. The `#gid=` part of the URL selects the tab.
3. Push this folder to a new GitHub repository in any account. If you upload through the GitHub website, **drag the `app`, `components` and `lib` folders** onto the upload page along with the root files. "Choose your files" skips folders, and Vercel then fails with *Couldn't find any `pages` or `app` directory*.
4. In Vercel, choose **Add New → Project**, import the repo, and add this environment variable:
   - `SHEET_URL` = the URL from step 2
   - Optional: `DASHBOARD_TITLE`, `CURRENCY`, `LOCALE`, `SHEET_NAME`, `DATE_ORDER` (see `.env.example`)
5. Deploy.

The sheet is cached for 5 minutes, so new rows appear within that time. The **Refresh** button fetches the latest data straight away.

### Without GitHub

Run this from the project folder. It deploys straight to whichever Vercel account you log in with:

```bash
npx vercel          # first run: log in and create the project
npx vercel env add SHEET_URL
npx vercel --prod
```

## Local development

```bash
npm install
cp .env.example .env.local   # then set SHEET_URL
npm run dev                  # http://localhost:3000
```

## Files

- `lib/sheet.ts` — downloads the sheet as CSV and maps the columns.
- `lib/metrics.ts` — metric definitions, aggregation and good/bad colouring.
- `lib/format.ts` — currency, percent and date formatting.
- `components/` — dashboard, date controls, scorecards and the PREV/CURR/% DIFF table.
- `app/api/data` — the uncached endpoint that the Refresh button uses.
