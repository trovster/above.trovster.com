import "dotenv/config"

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import matter from "gray-matter"
import collections from "./11ty/collections/index.js"
import filters from "./11ty/filters/index.js"
import functions from "./11ty/functions/index.js"
import plugins from "./11ty/plugins/index.js"
import shortcodes from "./11ty/shortcodes/index.js"

const photosDirectory = "src/content/photos"

const isEnabled = (value) => Number(value) === 1

const hasEnabledPanorama = (panorama) => panorama && typeof panorama === "object" && isEnabled(panorama.enabled) && panorama.src

const getUnpublishedPhotoFiles = () => {
    try {
        return readdirSync(photosDirectory, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => join(photosDirectory, entry.name, "index.md"))
            .filter((file) => {
                const { data } = matter(readFileSync(file, "utf8"))

                return !isEnabled(data.enabled) && !hasEnabledPanorama(data.panorama)
            })
    } catch {
        return []
    }
}

export default (config) => {
    config.addPlugin(collections)
    config.addPlugin(filters)
    config.addPlugin(functions)
    config.addPlugin(plugins)
    config.addPlugin(shortcodes)

    config.setDataDeepMerge(true)
    config.setQuietMode(true)
    config.setDataFileBaseName("index")

    config.addLayoutAlias("default", "layouts/default.webc")

    for (const file of getUnpublishedPhotoFiles()) {
        config.ignores.add(file)
    }

    config.addPassthroughCopy({ CNAME: "public/CNAME" })
    config.addPassthroughCopy({ "src/icons/favicon.svg": "public/favicon.svg" })
    config.addPassthroughCopy({ "src/icons/favicon.ico": "public/favicon.ico" })
    config.addPassthroughCopy({ "src/icons/apple-touch-icon.png": "public/apple-touch-icon.png" })

    return {
        dir: {
            input: "src",
            output: "dist",
            data: "data",
            layouts: "layouts",
            includes: "includes",
        },
        htmlTemplateEngine: "webc",
    }
}
