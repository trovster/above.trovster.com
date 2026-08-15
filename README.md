<p>
  <img src="./above.svg" alt="Above" width="360" />
</p>

This project is a collection of aerial photographs captured by **Trevor Morris**,
using consumer drones.

Built with [11ty](https://www.11ty.dev).

## Stack

- 11ty for static site generation
- WebC for layouts and components
- Vite for CSS and JavaScript bundling
- Basic BEM-oriented CSS for styling
- Sharp, BlurHash, colorthief, and Eleventy image tooling for photo processing
- Google Maps for locations and markers

## Development

Requires Node.js `>=24`.

```bash
npm install
npm start
```

Build a production version with:

```bash
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` for local development, then fill in the values
below:

```bash
cp .env.example .env
```

| Variable | Used by | Description |
| --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | Build (local and CI) | Google Maps JavaScript API key, baked into the built pages so maps render. |
| `GOOGLE_MAPS_MAP_ID` | Build (local and CI), optional | Map ID from Google Cloud Console (Maps Platform > Map Management). Enables the newer `AdvancedMarkerElement` markers; leave blank to fall back to the classic `Marker` API. |
| `MASTODON_INSTANCE_URL` | `npm run mastodon:post`, local only | Base URL of the Mastodon instance to post to. |
| `MASTODON_ACCESS_TOKEN` | `npm run mastodon:post`, local only | Access token with `write:media` and `write:statuses` scopes. |
| `MASTODON_STATUS_VISIBILITY` | `npm run mastodon:post`, optional | Default visibility for posted statuses. |
| `MASTODON_STATUS_LANGUAGE` | `npm run mastodon:post`, optional | Default language for posted statuses. |
| `SITE_URL` | `npm run mastodon:post`, optional | Site URL used to build the link back to a photo when posting. Falls back to the `homepage` field in `package.json`. |

### Storing Keys for GitHub Actions

The [deploy workflow](.github/workflows/deploy.yml) needs `GOOGLE_MAPS_API_KEY`
(and `GOOGLE_MAPS_MAP_ID`, if you're using one) at build time so the built
site has a working map. Store these as repository secrets rather than
committing them to the repo or the workflow file:

1. On GitHub, go to the repository's **Settings > Secrets and variables >
   Actions**.
2. Under **Repository secrets**, select **New repository secret**.
3. Add a secret named `GOOGLE_MAPS_API_KEY` with your Google Maps API key as
   the value.
4. Repeat for `GOOGLE_MAPS_MAP_ID` if you're using a Map ID.

The workflow picks these up automatically via
`${{ secrets.GOOGLE_MAPS_API_KEY }}` and passes them to the build step as
environment variables — nothing else needs to change when a key is rotated,
and the values never appear in the repository or the workflow logs.

The Mastodon variables are only used by the local `npm run mastodon:post`
script (see below) and aren't needed in GitHub Actions — keep those in your
local `.env` only, never as repository secrets or in the workflow.

## Adding Photos

Create a new folder in `src/photos/` for each image. Add the photo file and an
`index.md` file beside it.

```md
---
date: "2026-08-04T16:03:54+00:00"
enabled: 1
title: Beelsby
src: image.webp
alt: Aerial photograph of the church in Beelsby, Lincolnshire.
category: Church
meta:
  Name: St. Andrew
  Type: Church
  Listing: Grade II
  Built: 1889
location:
  name: Beelsby
  region: Lincolnshire, England
  latitude: 53.501214
  longitude: -0.180406
wikipedia:
  title: Beelsby
  url: https://en.wikipedia.org/wiki/Beelsby
---
```

The folder name becomes the photo URL, and `src` in the front-matter should
match the image filename in that folder. You can also add text in the main
content.

- `enabled` — set to `1` to publish the photo, or `0` to keep it out of the
  site while you're still working on it.
- `category` — used to group and filter photos (for example `Church`,
  `Architecture`, `Maritime`).
- `meta` — optional key/value pairs shown alongside the photo (for listed
  buildings, this might be their name, type, listing grade, and build date).
- `location` — required for the photo to appear on the map: a `name`,
  `region`, and its `latitude`/`longitude`.
- `wikipedia` — optional link to a Wikipedia article about the subject.

### Processing Photos

Process source photos before referencing them in front-matter:

```bash
npm run image:process -- src/photos/photo-title/photo.jpg
```

The command writes an optimized WebP image beside the source, resizes only when
the image is wider than 2500px, preserves image metadata, and adds the Above SVG
watermark in the bottom-right corner. Re-run it with options to tune the output:

```bash
npm run image:process -- src/photos/photo-title/photo.jpg --quality 88 --watermark-opacity 0.45 --watermark-width 420 --watermark-margin 80
```

Add `--watermark-fill` to fill the SVG watermark. It uses `--watermark-color`
by default, or `--watermark-fill-color` when you want a different fill.

Run `npm run image:process -- --help` for all options.

Process every original JPG/JPEG image in `src/photos/` with:

```bash
npm run image:process:photos --
```

Use `--dry-run` to preview the files and output paths without writing images.

## Posting to Mastodon

Copy `.env.example` to `.env` and set `MASTODON_INSTANCE_URL` and
`MASTODON_ACCESS_TOKEN`. The access token needs `write:media` and
`write:statuses` scopes.

Post a regular photo from `src/photos` with:

```bash
npm run mastodon:post -- beelsby
```

Preview the selected image and generated status without posting:

```bash
npm run mastodon:post -- beelsby --dry-run
```

Run `npm run mastodon:post -- --help` for visibility, language, content warning,
and custom status options.
