# manumythilmuralee.com

Portfolio for Manu Mythil Muralee. Applied economist and business strategist.

Built as three pages so a recruiter reaches the evidence in one scroll rather
than through a nav maze.

## Structure

| Path | What it is |
|---|---|
| `index.html` | Home. Hero, proof strip, the five-stop career route, closing card. |
| `projects.html` | Project write-ups, quantitative models first. |
| `cv.html` | The full written record. Plain text, no animation, copy-pasteable. |
| `css/style.css` | Legacy design system. Desktop-first. Serves the projects page. |
| `css/site.css` | Mobile-first layer. Owns the home and CV components. |
| `js/globe.js` | The scroll-driven globe. Progressive enhancement only. |
| `js/three-subset.js` | Three.js, tree-shaken to the symbols `globe.js` uses. |
| `data/geo.json` | Coastlines and the four highlighted administrative regions. |
| `fonts/` | Self-hosted Outfit and Inter, latin subset. |

Every other `.html` at the root is a redirect stub left behind by the eight-page
version of the site, so old inbound links still land somewhere useful.

## Running it locally

The globe fetches `data/geo.json`, so `file://` will not work. Serve it:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## The globe

`js/globe.js` is enhancement, never a dependency. The five career stops are real
semantic HTML. With JavaScript off, WebGL unavailable, the viewport under 900px,
`prefers-reduced-motion` set, `deviceMemory` under 4GB, or a connection reporting
3G or `saveData`, the page serves a static SVG route diagram and the same text.
Nothing about the career is reachable only through the animation.

The globe reacts to scroll position. It never takes control of scrolling.

Regions highlighted per stop: Andhra Pradesh (Sri City, Anantapur), Kerala
(Kochi), the UAE (Dubai), Comunidad de Madrid (Madrid). Dubai carries the country
outline because emirate-level boundary data was not available at build time.

## Before this becomes the primary site

1. Delete `robots.txt`. It currently blocks crawlers because this repo is a
   staging copy and the live site is at `manumythilmuralee.com`.
2. Add a `CNAME` file containing the domain, and remove it from whichever repo
   currently serves that domain. Two repositories cannot claim the same custom
   domain.
3. Check `sitemap.xml` and the `canonical` and `og:url` tags on all three pages
   point at the intended host.

## Open placeholders

- `{{TEAM_SIZE}}` in `cv.html`, in the Vaayubon entry.
