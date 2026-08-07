import photos from "./data/photos.js"

export default {
    pagination: {
        data: "collections.photos360",
        size: photos.pagination,
        alias: "paginatedPhotos",
        reverse: true,
    },
    permalink: ({ pagination }) => (pagination.pageNumber > 0 ? `/360/page/${pagination.pageNumber + 1}/` : "/360/"),
    eleventyComputed: {
        title: ({ pagination }) => (pagination.pageNumber > 0 ? `360 Photos | Page ${pagination.pageNumber + 1}` : "360 Photos"),
        description: () => "360 aerial landscape photography from around Lincolnshire.",
        bodyClass: () => "page page--gallery page--360",
    },
}
