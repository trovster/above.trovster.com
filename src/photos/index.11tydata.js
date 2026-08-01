export default {
    layout: "photo.webc",
    permalink: ({ page }) => `/${page.fileSlug}/`,
    eleventyComputed: {
        photo: async ({ collections, page }) => {
            const photos = await Promise.all(collections.photos ?? [])

            return photos.find((photo) => photo.url === page.url)
        },
        title: ({ title }) => title,
        description: () => "A photo by Trevor Morris.",
        bodyClass: () => "page page-photo",
    },
}
