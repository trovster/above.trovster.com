export default {
    pagination: {
        data: "collections.photos360",
        size: 1,
        alias: "view",
        addAllPagesToCollections: false,
    },
    permalink: ({ view }) => view.url,
    eleventyComputed: {
        title: ({ pagination }) => pagination.items[0].data.title,
        description: ({ pagination }) => pagination.items[0].data.alt ?? "",
        bodyClass: () => "page page--photo page--360-photo",
    },
}
