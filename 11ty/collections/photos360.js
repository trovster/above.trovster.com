import createPhotoCollection from "../services/create-photo-collection.js"

export default async (api) => createPhotoCollection(api, { glob: "**/360/**/*.md" })
