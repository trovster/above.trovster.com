import photos from "./data/photos.js"

export default {
    pagination: {
        data: "collections.photos",
        size: photos.pagination,
        alias: "paginatedPhotos",
        reverse: true,
    },
    permalink: ({ pagination }) => (pagination.pageNumber > 0 ? `/page/${pagination.pageNumber + 1}/` : "/"),
    eleventyComputed: {
        title: ({ pagination, site }) => (pagination.pageNumber > 0 ? `Page ${pagination.pageNumber + 1}` : site.title),
        description: () => "Favourite photos by Trevor Morris.",
        bodyClass: () => "page page-home",
    },
}
