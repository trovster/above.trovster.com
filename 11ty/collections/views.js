import createViewsCollection from "../services/create-views-collection.js"

export default async (api) => createViewsCollection(api, { glob: "**/views/**/*.md" })
