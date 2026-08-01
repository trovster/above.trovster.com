# Photo Website

This is a small personal photo website, built with [11ty](https://www.11ty.dev).

## Stack

- 11ty for static site generation
- WebC for layouts and components
- Tailwind CSS via PostCSS for styling
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

## Customising

- Update site title, description, and URL in `src/data/site.js`
- Update your profile details in `src/data/profile.js`
- Edit the about page in `src/about.webc`
- Change your avatar at `src/avatar.webp`
- Change the homepage, layouts, and components in `src/index.webc`,
  `src/layouts/`, and `src/components/`
- Update styles in `public/css/site.css`; Tailwind is compiled through
  `postcss.config.js`
