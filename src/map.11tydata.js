export default {
    title: "Map",
    description: "Every location on the map, from around Lincolnshire, captured by Trevor Morris.",
    bodyClass: "page page--map",
    eleventyComputed: {
        mapPhotos: async ({ collections }) => {
            const photos = await Promise.all(collections.photos ?? [])

            return photos
                .filter((photo) => photo.data.map)
                .map((photo) => ({
                    id: photo.data.id,
                    url: photo.url,
                    title: photo.data.title,
                    src: photo.data.src,
                    alt: photo.data.alt,
                    thumbnail: photo.data.thumbnail,
                    latitude: photo.data.map.latitude,
                    longitude: photo.data.map.longitude,
                }))
        },
    },
}
