import createPhotoCollection from "../services/create-photo-collection.js"

export default async (api) => createPhotoCollection(api, { glob: "**/photos/**/*.md", panorama: true })
