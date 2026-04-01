# ReliaDB Site — Technology & Deployment Context

Use this file for quick orientation: what the stack is, how builds work, and how the site reaches production.

---

## Stack overview

| Layer | Choice |
|--------|--------|
| **Site generator** | [Eleventy](https://www.11ty.dev/) (11ty) v3 — static site generator |
| **Templates** | [Nunjucks](https://mozilla.github.io/nunjucks/) (`.njk`) for layouts and pages; HTML where plain files suffice |
| **Blog & long-form content** | Markdown (`.md`) in `_posts/` with YAML front matter; Markdown rendered via `markdown-it` |
| **Categories** | Markdown definitions in `_categories/`; posts reference category slugs from the CMS |
| **Shared chrome** | `_includes/` (e.g. blog layout, footer partials) |
| **Client assets** | CSS, JavaScript, and images are copied through unchanged (Eleventy passthrough) |
| **Package manager** | npm (`package.json` at repo root) |
| **Site search** | [Pagefind](https://pagefind.app/) — indexes HTML in `_site/` after Eleventy; UI and WASM bundle emitted to `_site/pagefind/` at build time |

There is no React/Vue/Next.js runtime — output is **static HTML + assets** served by the CDN.

---

## Local development

```bash
npm install          # once
npm run dev          # Eleventy dev server with live reload (--serve)
npm run build        # production build → Eleventy to _site/, then Pagefind indexes _site/
```

- **Input:** project root (see `.eleventy.js` for `input`, `includes`, `output`).
- **Output:** `_site/` — this is what Netlify publishes (not the repo root).
- **Search:** `npm run build` runs Pagefind after Eleventy (`pagefind --site _site`), writing `_site/pagefind/` (index + UI). The Pagefind bundle loads only on `/search/index.html`. The **header magnifying glass** (all pages) opens an inline search bar and submits to `/search/index.html?q=…`; results run on the search page. **`npm run dev` does not run Pagefind** — to test search locally, run `npm run build` and serve `_site/` (for example `npx serve _site` or `npx pagefind --site _site --serve`). The footer still links to `/search/index.html`.

---

## Deployment model

| Aspect | Detail |
|--------|--------|
| **Hosting** | [Netlify](https://www.netlify.com/) |
| **Source** | Git repository (GitHub: `main` branch) |
| **Trigger** | Push to `main` → Netlify build → deploy |
| **Build command** | `npm run build` (runs `eleventy`) |
| **Publish directory** | `_site` (see `netlify.toml`) |
| **Domain** | Custom domain (e.g. reliadb.com); DNS typically pointed at Netlify nameservers |
| **HTTPS** | Provided by Netlify (Let’s Encrypt); `netlify.toml` includes HTTPS redirects and security headers |

Operational steps for domain, DNS, and first-time Netlify setup are expanded in `README-DEPLOY.md`.

---

## Integrations (production behavior)

| Integration | Role |
|-------------|------|
| **Decap CMS** (formerly Netlify CMS) | Admin UI at `/admin` for editing blog posts and categories; config in `admin/config.yml` |
| **Netlify Identity** | Authentication for `/admin` |
| **Netlify Git Gateway** | Lets Decap commit Markdown changes to the GitHub repo |
| **Formspree** | Contact form submissions from the contact page (form endpoint ID configured in HTML) |

Media uploads from the CMS go under `images/uploads` (see `admin/config.yml` `media_folder` / `public_folder`).

---

## Key files for engineers & AI context

| File | Purpose |
|------|---------|
| `package.json` | Scripts (`build`, `dev`) and dependencies (`@11ty/eleventy`, `markdown-it`, `pagefind`) |
| `.eleventy.js` | Collections (blog posts, categories), passthrough for `css`, `js`, `images`, `admin`, Markdown options |
| `netlify.toml` | Build command, publish dir, headers, redirects |
| `admin/config.yml` | Decap collections, Git Gateway backend, branch `main` |
| `.eleventyignore` | Files/folders excluded from the Eleventy build |

---

## Content locations (brief)

- **Blog posts:** `_posts/*.md`
- **Category metadata:** `_categories/*.md`
- **Layouts / partials:** `_includes/*.njk`
- **Blog listing & templates:** under `blog/` (e.g. `blog/index.njk`, category templates)
- **Static passthrough:** `css/`, `js/`, `images/`, `admin/`

---

## Version note

Dependencies and exact versions are pinned in `package.json` / lockfile. After `npm install`, prefer the installed versions over guesses in documentation.
