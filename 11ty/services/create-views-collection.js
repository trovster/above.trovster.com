import siblings from "../utils/photo-siblings.js"
import buildViewImages, { hasEnabledImages } from "../utils/view-images.js"

const isEnabled = (value) => Number(value) === 1

const createViewsCollection = async (api, { glob }) => {
    const entries = api
        .getFilteredByGlob(glob)
        .filter((entry) => isEnabled(entry.data.enabled) && hasEnabledImages(entry.data.images))

    return Promise.all(
        entries.map(async (entry, index) => {
            const { previous, next } = siblings(entries, index)

            return {
                url: entry.url,
                date: entry.date,
                data: {
                    ...entry.data,
                    id: entry.page.fileSlug,
                    images: await buildViewImages(entry),
                    previous: previous ? { url: previous.url, data: { title: previous.data.title } } : null,
                    next: next ? { url: next.url, data: { title: next.data.title } } : null,
                },
            }
        }),
    )
}

export default createViewsCollection
