import "dotenv/config"

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { build as viteBuild, createServer as createViteServer, mergeConfig } from "vite"
import collections from "./11ty/collections/index.js"
import filters from "./11ty/filters/index.js"
import functions from "./11ty/functions/index.js"
import plugins from "./11ty/plugins/index.js"
import shortcodes from "./11ty/shortcodes/index.js"
import viteConfig from "./vite.config.js"

let viteDevServer
let viteDevServerPromise
let viteDevServerResolve
let viteDevServerReject
let viteSignalCleanupRegistered = false

const photoDirectories = ["src/photos", "src/360"]

const isPhotoEnabled = (source) => {
    const enabled = source.match(/^enabled:\s*["']?([01])["']?\s*$/m)

    return Number(enabled?.[1]) === 1
}

const getDisabledPhotoFiles = () => {
    return photoDirectories.flatMap((directory) => {
        try {
            return readdirSync(directory, { withFileTypes: true })
                .filter((entry) => entry.isDirectory())
                .map((entry) => join(directory, entry.name, "index.md"))
                .filter((file) => !isPhotoEnabled(readFileSync(file, "utf8")))
        } catch {
            return []
        }
    })
}

const getViteDevServerPromise = () => {
    if (!viteDevServerPromise) {
        viteDevServerPromise = new Promise((resolve, reject) => {
            viteDevServerResolve = resolve
            viteDevServerReject = reject
        })
    }

    return viteDevServerPromise
}

const closeViteDevServer = async () => {
    if (viteDevServer) {
        const server = viteDevServer
        viteDevServer = undefined
        viteDevServerPromise = undefined
        viteDevServerResolve = undefined
        viteDevServerReject = undefined

        await server.close()
    }
}

const registerViteSignalCleanup = () => {
    if (viteSignalCleanupRegistered) {
        return
    }

    viteSignalCleanupRegistered = true

    process.once("SIGINT", async () => {
        await closeViteDevServer()
        process.exit(130)
    })

    process.once("SIGTERM", async () => {
        await closeViteDevServer()
        process.exit(143)
    })
}

const createEleventyViteServer = async (eleventyServer) => {
    const nodeServer = eleventyServer.server

    if (!viteDevServerPromise) {
        getViteDevServerPromise()
    }

    if (viteDevServer) {
        viteDevServerResolve?.(viteDevServer)
        return viteDevServer
    }

    try {
        viteDevServer = await createViteServer(
            mergeConfig(viteConfig, {
                server: {
                    middlewareMode: {
                        server: nodeServer,
                    },
                },
            }),
        )

        registerViteSignalCleanup()
        viteDevServerResolve?.(viteDevServer)

        return viteDevServer
    } catch (error) {
        viteDevServerReject?.(error)
        throw error
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
    config.setServerPassthroughCopyBehavior("passthrough")

    config.addLayoutAlias("default", "layouts/default.webc")

    for (const file of getDisabledPhotoFiles()) {
        config.ignores.add(file)
    }

    config.addPassthroughCopy({
        "public/fonts/": "/fonts/",
        "public/images/": "/images/",
    })

    config.on("eleventy.before", async ({ runMode }) => {
        if (runMode === "build") {
            await viteBuild(viteConfig)
        }
    })

    config.setServerOptions({
        setup: () => {
            const viteServer = getViteDevServerPromise()

            return {
                middleware: [
                    async (request, response, next) => {
                        const server = await viteServer
                        server.middlewares(request, response, next)
                    },
                ],
            }
        },
        ready: createEleventyViteServer,
    })

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
