import { existsSync } from "node:fs"
import path from "node:path"

import createOgImage from "../../11ty/utils/og-image.js"

const inputDirectory = "src"

// Photo `data.src` values are output-relative (e.g. `/content/photos/x/image.jpg`);
// join them onto the input directory to get the real file on disk.
const toFile = (src) => path.join(inputDirectory, src)

const asSource = (photo) => (photo?.data?.src ? { file: toFile(photo.data.src), alt: photo.data.alt } : null)

// The site-wide default card. `OG_IMAGE` (a photo slug, e.g.
// `brocklesby-park-mausoleum`) pins a specific photo; when it is unset or the
// slug is unknown, fall back to the newest photo (the collection is sorted
// oldest-first, so that is the last entry).
const defaultPhoto = (photos) => {
    const slug = process.env.OG_IMAGE?.trim()
    const pinned = slug ? photos.find((entry) => entry?.data?.id === slug) : null

    return asSource(pinned) ?? asSource(photos.at(-1))
}

// Resolve which photo an Open Graph card should be built from:
//   - a standard photo page uses its own primary photo
//   - a 360 page uses the sibling primary `image.jpg`, if one exists
//   - everything else (home, map, about, 404, galleries) uses the latest photo
const resolveOgSource = async (data) => {
    const { photo, view } = data
    const photos = await Promise.all(data.collections?.photos ?? [])

    if (photo?.data?.src) {
        return asSource(photo)
    }

    if (view?.data?.src) {
        const primary = path.join(path.dirname(view.data.src), "image.jpg")
        const file = toFile(primary)

        if (existsSync(file)) {
            const sibling = photos.find((entry) => entry?.data?.id === view.data.id)

            return { file, alt: sibling?.data?.alt ?? view.data.alt ?? view.data.title }
        }
    }

    return defaultPhoto(photos)
}

// A global data file is keyed by its filename, so this export *is* the
// `eleventyComputed` data — do not nest it under another `eleventyComputed` key.
export default {
    ogImage: async (data) => {
        try {
            const source = await resolveOgSource(data)

            if (!source) {
                return null
            }

            const image = await createOgImage(source.file)

            if (!image) {
                return null
            }

            return { ...image, alt: source.alt ?? data.site?.description }
        } catch {
            return null
        }
    },
}
