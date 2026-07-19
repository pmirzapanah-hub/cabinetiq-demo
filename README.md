# CabinetIQ prototype — deployment

This folder is a self-contained Cloudflare Pages project:

```
index.html               the app (static, client-side)
functions/api/analyze.js the server-side proxy that calls Anthropic with your API key
```

The browser never sees your API key. `index.html` calls `/api/analyze` on
its own origin; `analyze.js` runs on Cloudflare's edge, attaches your key,
and forwards the request to Anthropic.

## 1. Get an Anthropic API key

console.anthropic.com → Settings → API Keys → Create Key. Copy it, you'll
paste it into Cloudflare in step 3 (not into any file).

## 2. Push this folder to a GitHub repo

```
cd cabinetiq-deploy
git init
git add .
git commit -m "CabinetIQ prototype"
git branch -M main
git remote add origin https://github.com/<you>/cabinetiq-demo.git
git push -u origin main
```

## 3. Create the Cloudflare Pages project

Same flow you used for `nestfiles-web`:

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
2. Select the `cabinetiq-demo` repo
3. Build settings: **Framework preset: None**, build command blank,
   output directory `/` (this is a static file plus a Functions folder,
   nothing to build)
4. Deploy

Then set the secret:

Pages project → Settings → Environment variables → Add variable
- Name: `ANTHROPIC_API_KEY`
- Value: (the key from step 1)
- Type: **Secret** (not plaintext)
- Scope: Production (and Preview if you want preview deploys to work too)

Redeploy once after adding the variable so the Function picks it up.

## 4. Test

Visit the `*.pages.dev` URL Cloudflare gives you (or your custom domain
once attached). The full flow — including "Analyze with AI" — will work
for anyone you send the link to, without them needing their own API key.

## Notes

- `analyze.js` pins the model to `claude-sonnet-4-6` and caps `max_tokens`
  at 1500, so the endpoint can't be pointed at a different model or used
  for large unrelated requests even if someone finds the URL.
- There's no rate limiting or auth on `/api/analyze` beyond that — anyone
  with the link can trigger analysis calls against your API key. Fine for
  a demo shared with specific people; if you're putting this in front of
  the public, add a shared secret header check or Cloudflare Turnstile
  before going further.
- No database — every session starts fresh. Project data doesn't persist
  between visits or page reloads.
