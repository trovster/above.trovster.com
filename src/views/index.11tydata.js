import readPublishedViews from "../../11ty/utils/read-published-views.js"
import siblings from "../../11ty/utils/photo-siblings.js"
import buildViewImages, { hasEnabledImages } from "../../11ty/utils/view-images.js"

const isEnabled = (value) => Number(value) === 1

const isPublished = ({ enabled, images }) => isEnabled(enabled) && hasEnabledImages(images)

const findSiblings = (page) => {
    const publishedViews = readPublishedViews()
    const index = publishedViews.findIndex((view) => view.slug === page.fileSlug)

    if (index === -1) {
        return { previous: null, next: null }
    }

    const { previous, next } = siblings(publishedViews, index)

    return {
        previous: previous ? { url: `/views/${previous.slug}/`, data: { title: previous.data.title } } : null,
        next: next ? { url: `/views/${next.slug}/`, data: { title: next.data.title } } : null,
    }
}

export default {
    layout: "views-detail.webc",
    permalink: ({ enabled, images, page }) => (isPublished({ enabled, images }) ? `/views/${page.fileSlug}/` : false),
    eleventyComputed: {
        eleventyExcludeFromCollections: ({ enabled, images }) => !isPublished({ enabled, images }),
        view: async ({ enabled, images, title, date, page }) => {
            if (!isPublished({ enabled, images })) {
                return null
            }

            const entry = {
                data: { images, title },
                inputPath: page.inputPath,
                filePathStem: page.filePathStem,
            }

            const { previous, next } = findSiblings(page)

            return {
                url: page.url,
                date,
                data: {
                    id: page.fileSlug,
                    title,
                    images: await buildViewImages(entry),
                    previous,
                    next,
                },
            }
        },
        title: ({ title }) => title,
        description: () => "Multiple photographs from around Lincolnshire, each telling a fuller story of the place.",
        bodyClass: () => "page page--photo page--view",
    },
}
