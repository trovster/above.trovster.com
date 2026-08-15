import createPhotoCollection from "../services/create-photo-collection.js"

export default async (api) => createPhotoCollection(
  api,
  {
    glob: "**/photos/**/*.md",
    panoramaGlob: "**/360/**/*.md",
    viewsGlob: "**/views/**/*.md"
  }
)
