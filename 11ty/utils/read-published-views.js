import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import matter from "gray-matter"

import { hasEnabledImages } from "./view-images.js"

const VIEWS_DIR = "src/views"

const isEnabled = (value) => Number(value) === 1

// Individual view pages cannot reliably read `collections.views` from within their own
// `eleventyComputed` — that named collection is only built on demand, and nothing
// forces it to resolve before these pages compute their own data, so the lookup can
// come back empty. Reading published views directly from disk sidesteps that entirely.
const readPublishedViews = () => {
    let directoryEntries

    try {
        directoryEntries = readdirSync(VIEWS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    } catch {
        return []
    }

    return directoryEntries
        .map((entry) => {
            const slug = entry.name
            const filePath = path.join(VIEWS_DIR, slug, "index.md")

            try {
                const { data } = matter(readFileSync(filePath, "utf8"))

                return { slug, data }
            } catch {
                return null
            }
        })
        .filter(Boolean)
        .filter(({ data }) => isEnabled(data.enabled) && hasEnabledImages(data.images))
        .sort((a, b) => new Date(a.data.date) - new Date(b.data.date))
}

export default readPublishedViews
