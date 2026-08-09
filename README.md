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

## Adding Photos

Create a new folder in `src/photos/` for each image. Add the photo file and an
`index.md` file beside it.

```md
---
date: "2026-05-01T10:15:34+00:00"
title: Photo Title.
src: photo.jpg
alt: Description of the photo.
---
```

The folder name becomes the photo URL, and `src` in the front-matter should
match the image filename in that folder. You can also add text in the main
content.

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
