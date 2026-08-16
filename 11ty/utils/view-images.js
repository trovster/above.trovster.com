import path from "node:path"

import blurhash from "./blurhash.js"

const isEnabled = (value) => Number(value) === 1

const enabledImages = (images) => (Array.isArray(images) ? images.filter((image) => isEnabled(image?.enabled)) : [])

const hasEnabledImages = (images) => enabledImages(images).length > 0

const buildViewImages = async (entry) => {
    const images = enabledImages(entry.data.images)

    return Promise.all(
        images.map(async (image, index) => {
            const file = path.join(path.dirname(entry.inputPath), image.src)
            const src = path.join(path.dirname(entry.filePathStem), image.src)
            const number = index + 1

            return {
                src,
                url: entry.url,
                number,
                alt: `${entry.data.title} — photo ${number} of ${images.length}`,
                blurhash: await blurhash(file),
            }
        }),
    )
}

export default buildViewImages
export { hasEnabledImages }
