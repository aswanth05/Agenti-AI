# Aswanth Saranu — Portfolio

Static site (HTML + CSS + JS, no build step) built for GitHub Pages.

## Things to fill in

| What | Where |
|---|---|
| WhatsApp number, display text, pre-filled message | `assets/js/config.js` |
| Web3Forms key (Book-a-call form → your email) | `assets/js/config.js`. Get a free key at web3forms.com |
| Projects (8 placeholder cards) | `assets/js/projects.js` |
| About-me text | `index.html`, the `#aboutText` paragraph |
| Photo | replace `assets/img/aswanth.jpg` (portrait, ~820px wide, keep under 200 KB) |

Until the Web3Forms key is set, the form falls back to opening WhatsApp with the visitor's details pre-filled.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a GitHub repo and push this folder (the `references/` folder is git-ignored).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)`.
3. The site goes live at `https://<username>.github.io/<repo>/` within a minute or two.
   If you name the repo `<username>.github.io`, it's served at the root domain.

All paths are relative, so the site works on either URL form and on a custom domain.
