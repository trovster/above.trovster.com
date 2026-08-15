import Image from "@11ty/eleventy-img"

const SIZE = 50
const FORMAT = "jpeg"

/**
 * Build a small, square, centre-cropped JPEG thumbnail for a photo (used as
 * the circular photo inset on map pin markers), returned inline as a
 * `data:` URL rather than written to disk — `@11ty/eleventy-img` handles the
 * resize/crop/encode/caching, `dryRun` just skips the file write.
 *
 * @param {String} file - path to the source image
 * @returns {Promise<String|null>} a `data:image/jpeg;base64,...` URL, or null
 */
const createMarkerThumbnail = async (file) => {
    try {
        const stats = await Image(file, {
            widths: [SIZE],
            formats: [FORMAT],
            dryRun: true,
            useCache: true,
            sharpJpegOptions: { quality: 80 },
            transform: async (sharpInstance) => {
                sharpInstance.resize(SIZE, SIZE, { fit: "cover", position: "centre" })
            },
        })

        const [output] = stats[FORMAT] ?? []

        if (!output?.buffer) {
            return null
        }

        return `data:image/${FORMAT};base64,${output.buffer.toString("base64")}`
    } catch {
        return null
    }
}

export default createMarkerThumbnail
