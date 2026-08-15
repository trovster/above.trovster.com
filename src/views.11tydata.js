import photos from "./data/photos.js"

export default {
    pagination: {
        data: "collections.views",
        size: photos.pagination,
        alias: "paginatedViews",
        reverse: true,
    },
    permalink: ({ pagination }) => (pagination.pageNumber > 0 ? `/views/page/${pagination.pageNumber + 1}/` : `/views/`),
    eleventyComputed: {
        title: ({ pagination }) => (pagination.pageNumber > 0 ? `Views | Page ${pagination.pageNumber + 1}` : "Views"),
        description: () => "Multiple photographs from around Lincolnshire, each telling a fuller story of the place.",
        bodyClass: () => "page page--gallery page--views",
    },
}
