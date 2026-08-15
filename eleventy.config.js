import "dotenv/config"

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import collections from "./11ty/collections/index.js"
import filters from "./11ty/filters/index.js"
import functions from "./11ty/functions/index.js"
import plugins from "./11ty/plugins/index.js"
import shortcodes from "./11ty/shortcodes/index.js"

const photoDirectories = ["src/photos", "src/360", "src/views"]

const isPhotoEnabled = (source) => {
    const enabled = source.match(/^enabled:\s*["']?([01])["']?\s*$/m)

    return Number(enabled?.[1]) === 1
}
const hasEnabledImage = (source) => /^[ \t]+enabled:\s*["\']?1["\']?\s*$/m.test(source)

const getDisabledPhotoFiles = () => {
    return photoDirectories.flatMap((directory) => {
        try {
            return readdirSync(directory, { withFileTypes: true })
                .filter((entry) => entry.isDirectory())
                .map((entry) => join(directory, entry.name, "index.md"))
                .filter((file) => {
                    const source = readFileSync(file, "utf8")

                    if (!isPhotoEnabled(source)) {
                        return true
                    }

                    // Views items list individually enabled/disabled images. An item with
                    // no enabled images should be treated as disabled, regardless of its
                    // own top-level `enabled` flag.
                    return directory === "src/views" && !hasEnabledImage(source)
                })
        } catch {
            return []
        }
    })
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

    for (const file of getDisabledPhotoFiles()) {
        config.ignores.add(file)
    }

    config.addPassthroughCopy("CNAME")
    config.addPassthroughCopy({ "src/icons/favicon.svg": "favicon.svg" })
    config.addPassthroughCopy({ "src/icons/favicon.ico": "favicon.ico" })
    config.addPassthroughCopy({ "src/icons/apple-touch-icon.png": "apple-touch-icon.png" })

    return {
        dir: {
            input: "src",
            output: "dist",
            data: "data",
            layouts: "layouts",
            includes: "includes",
        },
        markdownTemplateEngine: "webc",
        htmlTemplateEngine: "webc",
    }
}
