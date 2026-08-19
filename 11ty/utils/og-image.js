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

const watermarkOverrides = Object.freeze({
    width: 0.4,
    position: "center",
})

/**
 * Build a 1200x630 Open Graph card from a source photo: centre-cropped to the
 * social ratio, with a large centred watermark, encoded as JPEG. Handled by
 * `@11ty/eleventy-img` (resize/encode/hashing/de-duplication/caching).
 *
 * @param {String} file - path to the source image
 * @returns {Promise<{url: String, width: Number, height: Number}|null>}
 */
const createOgImage = async (file) => {
    const stats = await Image(file, {
        widths: [WIDTH],
        formats: [FORMAT],
        outputDir: OUTPUT_DIR,
        urlPath: URL_PATH,
        sharpJpegOptions: { quality: 82, mozjpeg: true },
        transform: async (sharpInstance) => {
            sharpInstance.resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })

            const watermark = await createWatermark(WIDTH, HEIGHT, watermarkOverrides)

            sharpInstance.composite([
                {
                    input: watermark.buffer,
                    left: watermark.left,
                    top: watermark.top,
                },
            ])
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
