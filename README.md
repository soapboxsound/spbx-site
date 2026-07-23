# SPBX Marketing Site

Astro static site for [www.spbx.io](https://www.spbx.io).

## Routes (v1)

| Path | Purpose |
|------|---------|
| `/` | Home — hero, positioning, manifesto teaser, pillars, access |
| `/product` | Product overview |
| `/for` | Who it’s for |
| `/manifesto` | Full manifesto |
| `/contact` | Early access |

Pricing is intentionally out of scope until numbers lock.

## SEO

- Canonical host: `https://www.spbx.io` (point apex `spbx.io` → www in DNS/hosting)
- `robots.txt` + `@astrojs/sitemap`
- Open Graph + Organization JSON-LD
- Optional Search Console: set `PUBLIC_GOOGLE_SITE_VERIFICATION`

**Do not** SEO/index product hosts (tenant admin, review, talent). Sign-in links to admin only; those apps stay noindex on their own deploy.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Archive

The former SPBX Sound one-pager lives in `archive/sound-onepager/` for reference.
