import path from "node:path"

import Image from "@11ty/eleventy-img"

import { createWatermark } from "./image-transform.js"

// The recommended Open Graph image size (1.91:1). Facebook, X, LinkedIn,
// Slack, and iMessage all render this ratio without cropping.
const WIDTH = 1200
const HEIGHT = 630

// JPEG (not WebP) for the widest social-crawler compatibility.
const FORMAT = "jpeg"

// Written into the Eleventy output as `public/img/og/*`, which the Vite pass
// copies verbatim to `/img/og/*` in the site root (same convention as the
// favicon/CNAME passthrough copies).
const OUTPUT_DIR = "dist/public/img/og"
const URL_PATH = "/img/og/"

// A standard sans-serif stack; fontconfig substitutes an available sans-serif
// (e.g. on CI) so the title always renders.
const TITLE_FONT = "Helvetica, sans-serif"

const watermarkOverrides = Object.freeze({
    width: 0.4,
    position: "center",
})

const escapeXmlText = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

// A page title in white, centred just below the "Above" watermark. The font
// shrinks to fit the card width for longer titles. `top` is the y-coordinate
// where the text should sit; the baseline is offset down by the cap height.
const createTitleOverlay = (title, top) => {
    const margin = Math.round(WIDTH * 0.05)
    const maxWidth = WIDTH - margin * 2
    const minFontSize = Math.round(WIDTH * 0.01)

    let fontSize = Math.round(WIDTH * 0.02)

    // Rough single-line width estimate; step down until it fits (or bottoms out).
    while (fontSize > minFontSize && title.length * fontSize * 0.5 > maxWidth) {
        fontSize -= 2
    }

    const x = Math.round(WIDTH / 2)
    const y = top + Math.round(fontSize * 0.72)
    const text = escapeXmlText(title)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
<g font-family="${TITLE_FONT}" font-size="${fontSize}" font-weight="700" text-anchor="middle">
<text x="${x}" y="${y}" fill="#ffffff">${text}</text>
</g>
</svg>`

    return Buffer.from(svg)
}

/**
 * Build a 1200x630 Open Graph card from a source photo: centre-cropped to the
 * social ratio, with a large centred watermark and, for an individual page, its
 * title centred just below the watermark. Handled by `@11ty/eleventy-img`
 * (resize/encode/hashing/de-duplication/caching).
 *
 * `manualCacheKey` folds the title into the content hash so a titled card and
 * the untitled default built from the same photo do not collide.
 *
 * @param {String} file - path to the source image
 * @param {{title?: String}} [options]
 * @returns {Promise<{url: String, width: Number, height: Number}|null>}
 */
const createOgImage = async (file, { title } = {}) => {
    const stats = await Image(file, {
        widths: [WIDTH],
        formats: [FORMAT],
        outputDir: OUTPUT_DIR,
        urlPath: URL_PATH,
        sharpJpegOptions: { quality: 82, mozjpeg: true },
        manualCacheKey: `og-v1:${title ?? ""}`,
        transform: async (sharpInstance) => {
            sharpInstance.resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })

            const watermark = await createWatermark(WIDTH, HEIGHT, watermarkOverrides)
            const layers = [
                {
                    input: watermark.buffer,
                    left: watermark.left,
                    top: watermark.top,
                },
            ]

            if (title) {
                const titleTop = watermark.top + watermark.height + 10
                layers.push({ input: createTitleOverlay(title, titleTop), top: 0, left: 0 })
            }

            sharpInstance.composite(layers)
        },
    })

    const [output] = stats[FORMAT] ?? []

    if (!output) {
        return null
    }

    return {
        url: `${URL_PATH}${path.basename(output.outputPath)}`,
        width: output.width,
        height: output.height,
    }
}

export default createOgImage
