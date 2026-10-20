# Ecoverse

Website for Ecoverse (`ecoverseearth.com`), a TLNB Services LLP venture that turns everyday environmental action into a verified, permanent record of impact. Launched for World Environment Day (June 5).

It is a plain static site: HTML, CSS and JavaScript with no build step or backend.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Launch homepage (hero, ecosystem, Green Summit announcement) |
| `about.html`, `approach.html`, `impact.html`, `connect.html` | Supporting pages |
| `404.html` | Not-found page |
| `articles/` | The Journal: `index.html` plus six long-form essays on verification, trust and unpriced environmental work |
| `styles.css` | Shared site styles |
| `home.css`, `home.js` | Homepage and cinematic effects: smooth scroll, custom cursor, card tilt, hero particle network, impact orbit canvas, pinned horizontal journey; also article features (reading progress, related articles, share row, back-to-top) |
| `script.js` | Icon initialization and scroll parallax |
| `assets/images/` | Announcement and article cover images |
| `sitemap.xml`, `robots.txt` | SEO files |
| `CNAME` | Custom domain for GitHub Pages |

Pages include Open Graph/Twitter metadata and schema.org JSON-LD naming TLNB Services LLP as the parent organization.

## Local preview

    python3 -m http.server 8000

Then open http://localhost:8000.

## Hosting

Deployed as static files (GitHub Pages or any static host) on `ecoverseearth.com`.
