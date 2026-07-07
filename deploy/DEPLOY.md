# Deploying to Cloudflare (lean.cau.li)

Architecture:

- **App shell → Cloudflare Pages** at `lean.cau.li` (index.html, bundled React,
  worker iframes, `lean-manifest.json`). Small; changes when app logic changes.
- **Heavy assets → Cloudflare R2** behind the CDN at `assets.cau.li`
  (`lean.js` 100MB, `lean.wasm` 118MB, ~2,471 `.olean` files 240MB,
  `lean-lib-files.json`). Immutable per Lean build; cached one year.

The app finds the R2 assets through `VITE_LEAN_WASM_BASE` (see `src/config.ts`),
baked in at build time. No COOP/COEP needed (single-threaded build), so R2 only
needs a CORS policy — no cross-origin-isolation headers anywhere.

Steps marked **[you]** touch your accounts (I can't); **[cli]** I can run once
you're logged in.

---

## 0. One-time account setup

1. **[you]** Create/log into Cloudflare, then authenticate the CLI. In this
   chat, run it yourself so the browser OAuth completes:
   ```
   ! npm i -g wrangler && wrangler login
   ```

2. **[you]** Move `cau.li` onto Cloudflare so R2 and the subdomains get a clean
   custom domain (recommended; low risk — the domain is empty):
   - Cloudflare dashboard → **Add a site** → `cau.li` → Free plan. It scans
     existing DNS (nothing to import).
   - It shows two nameservers. At **Hover** → `cau.li` → DNS/Nameservers →
     replace Hover's nameservers with Cloudflare's two. Propagation: minutes–hours.

   > Fallback if you'd rather NOT move nameservers: skip the R2 custom domain and
   > use the bucket's `https://pub-<hash>.r2.dev` URL as `VITE_LEAN_WASM_BASE`.
   > Cloudflare rate-limits `r2.dev` and discourages production use — risky when
   > the app fetches ~628 oleans at once — so the nameserver move is preferred.

---

## 1. R2 bucket for the assets

1. **[cli]** Create the bucket:
   ```
   wrangler r2 bucket create lean-assets
   ```
2. **[you]** Custom domain: dashboard → R2 → `lean-assets` → Settings →
   **Public access → Custom Domains** → add `assets.cau.li`. Cloudflare creates
   the proxied DNS record automatically (needs step 0.2).
3. **[you/cli]** CORS: dashboard → bucket → Settings → CORS policy → paste
   `deploy/r2-cors.json`. (Allows GET/HEAD from `lean.cau.li` and localhost.)
4. **[you]** For bulk upload, create an **R2 API token** (dashboard → R2 → Manage
   API Tokens → Object Read & Write). Configure rclone once:
   ```
   ! rclone config
   # new remote named "r2", type "s3", provider "Cloudflare",
   # access_key_id / secret_access_key from the token,
   # endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

---

## 2. Upload the assets to R2

With the WASM artifact in `public/lean-wasm/` (symlinks are followed):

```
# optional: shrink first-load transfers ~2.3x (adds .olean.gz siblings)
npm run compress-oleans

R2_BUCKET=lean-assets deploy/upload-r2.sh
```

Re-run after any artifact swap — rclone uploads only what changed.

---

## 3. Build + deploy the app to Pages

1. **[cli]** Build, pointing the app at the R2 domain. Use the helper — a plain
   `vite build` would copy the symlinked `public/lean-wasm` (gigabytes of R2
   assets) into `dist`; this strips them so only the ~1MB shell ships:
   ```
   VITE_LEAN_WASM_BASE=https://assets.cau.li deploy/build-pages.sh
   ```
2. **[cli]** Deploy the static output:
   ```
   wrangler pages deploy dist --project-name lean-playground
   ```
3. **[you]** Custom domain: dashboard → Pages → `lean-playground` → Custom
   domains → add `lean.cau.li` (auto-creates the DNS record; needs step 0.2).

Redeploys after an app change: repeat 3.1–3.2 (no R2 re-upload needed).

---

## Verify

- `https://assets.cau.li/lean.wasm` → 200, `content-type: application/wasm`,
  `cache-control: …immutable`.
- `https://lean.cau.li` → app loads; "Load Lean 4 WASM" then "Run Code" works;
  a second run logs `served from persistent cache`.
