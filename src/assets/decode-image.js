/**
 * Wait for an <img> element to be decoded and ready to draw, without
 * throwing if it fails to load.
 *
 * @param {HTMLImageElement|null} image
 * @returns {Promise<HTMLImageElement|null>}
 */
const decodeImage = async (image) => {
    if (!image) {
        return null
    }

    try {
        if (image.decode) {
            await image.decode()
        } else if (!image.complete) {
            await new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true })
                image.addEventListener("error", resolve, { once: true })
            })
        }
    } catch {
        // Ignore decode failures; marker icon creation falls back to a plain circle.
    }

    return image
}

export { decodeImage }
