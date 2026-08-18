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

| Variable                     | Used by                             | Description                                                                                                                                                                 |
| ---------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_MAPS_API_KEY`        | Build (local and CI)                | Google Maps JavaScript API key, baked into the built pages so maps render.                                                                                                  |
| `GOOGLE_MAPS_MAP_ID`         | Build (local and CI), optional      | Map ID from Google Cloud Console (Maps Platform > Map Management). Enables the newer `AdvancedMarkerElement` markers; leave blank to fall back to the classic `Marker` API. |
| `MASTODON_INSTANCE_URL`      | `npm run mastodon:post`, local only | Base URL of the Mastodon instance to post to.                                                                                                                               |
| `MASTODON_ACCESS_TOKEN`      | `npm run mastodon:post`, local only | Access token with `write:media` and `write:statuses` scopes.                                                                                                                |
| `MASTODON_STATUS_VISIBILITY` | `npm run mastodon:post`, optional   | Default visibility for posted statuses.                                                                                                                                     |
| `MASTODON_STATUS_LANGUAGE`   | `npm run mastodon:post`, optional   | Default language for posted statuses.                                                                                                                                       |
| `SITE_URL`                   | `npm run mastodon:post`, optional   | Site URL used to build the link back to a photo when posting. Falls back to the `homepage` field in `package.json`.                                                         |

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

Create a new photo folder and basic unpublished `index.md` from its title:

```bash
npm run create -- Aylesby
npm run create -- "Cleethorpes Country Park"
```

The command converts the title into a kebab-case folder name inside
`src/content/photos/`. Add the photo file beside the generated `index.md`, then
complete its front matter and set `enabled` to `1` when it is ready to publish.

```md
---
date: "2026-08-04T16:03:54+00:00"
enabled: 1
title: Beelsby
src: image.jpg
alt: Aerial photograph of the church in Beelsby, Lincolnshire.
panorama:
  enabled: 1
  src: panorama.jpg
  alt: 360 aerial photograph of Beelsby, Lincolnshire.
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
- `panorama` — optional 360 photo data used to generate the separate 360
  collection and `/360/<photo>/` detail page. Its source image should be named
  `panorama.jpg`; set its nested `enabled` value to `0` to keep it unpublished.
  Panorama dates, titles, and locations are inherited from the main photo.
- `category` — used to group and filter photos (for example `Church`,
  `Architecture`, `Maritime`).
- `meta` — optional key/value pairs shown alongside the photo (for listed
  buildings, this might be their name, type, listing grade, and build date).
- `location` — required for the photo to appear on the map: a `name`,
  `region`, and its `latitude`/`longitude`.
- `wikipedia` — optional link to a Wikipedia article about the subject.
- `weather` — generated by `npm run image:metadata` (see below); holds a
  `summary` of the conditions and a `temperature` for when the photo was taken.
  Not edited by hand.

### Extracting Metadata and Weather

Populate a photo's `date` and `location` coordinates from the image's EXIF data,
and record the weather at the time and place it was taken:

```bash
npm run image:metadata -- --dry-run
npm run image:metadata --
```

By default it inspects `git status` for newly added images in
`src/content/photos`, reads their EXIF, and writes `date`,
`location.latitude`, and `location.longitude` into the matching `index.md`. Pass
`--all` to process every photo folder, or a specific path such as
`src/content/photos/beelsby`.

When a photo has both a date and coordinates, it fetches the
[Open-Meteo](https://open-meteo.com) forecast for that location and day, keeps
only the 15-minute reading nearest the capture time, and stores it as
`weather.json` in the photo folder. From that reading it sets a short
`weather.summary` of the conditions (for example `"Overcast, light breeze"`) and
a `weather.temperature` (for example `"19°C"`). Weather is only fetched when
`weather.json` is missing; pass `--refresh-weather` to re-fetch, or
`--skip-weather` to leave weather untouched. No API key is required.

### Processing Photos

Reference the original JPG files directly in front matter. During the Eleventy
build, primary, panorama, and gallery images produce responsive WebP variants.
Primary files named `image.jpg` receive the "Above" watermark; panoramas and
numbered gallery images remain unwatermarked. The build reports each resize,
format conversion, and watermark operation as it is applied.

Primary and panorama images produce variants at 400px, 800px, 1200px, and
1400px wide, plus the original image width as the largest `srcset` candidate.

### Resizing Committed Originals

Resize the committed JPG/JPEG source files in place before generating their
WebP versions:

```bash
npm run image:process:originals -- --dry-run
npm run image:process:originals --
```

The command limits `image.jpg` to 2500px wide, `panorama.jpg` to 6000px,
and numbered gallery images such as `1.jpg` to 2000px. It does not enlarge or
rewrite images that are already within their limit. Resized files use JPEG
quality 100 with no watermark or other visual changes, and preserve all
supported EXIF, ICC, XMP, and IPTC metadata. Review and commit the resulting
original JPG changes separately.

## Posting to Mastodon

Copy `.env.example` to `.env` and set `MASTODON_INSTANCE_URL` and
`MASTODON_ACCESS_TOKEN`. The access token needs `write:media` and
`write:statuses` scopes.

Post a regular photo from `src/content/photos` with:

```bash
npm run mastodon:post -- beelsby
```

Preview the selected image and generated status without posting:

```bash
npm run mastodon:post -- beelsby --dry-run
```

Run `npm run mastodon:post -- --help` for visibility, language, content warning,
and custom status options.
