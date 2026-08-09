import { EleventyHtmlBasePlugin } from "@11ty/eleventy"
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img"
import { feedPlugin } from "@11ty/eleventy-plugin-rss"
import EleventyVitePlugin from "@11ty/eleventy-plugin-vite"
import EleventyWebcPlugin from "@11ty/eleventy-plugin-webc"
import site from "../../src/data/site.js"
import { applyHtmlBasePathPrefix } from "../utils/html-base.js"
import viteConfig from "../../vite.config.js"

export default (config) => {
    const plugins = [
        {
            plugin: EleventyHtmlBasePlugin,
            options: {
                // WebC renders nested HTML multiple times, so we keep the base
                // filters but replace the automatic URL transform with an
                // idempotent version below.
                extensions: "",
            },
        },
        {
            plugin: EleventyWebcPlugin,
            options: {
                components: [`${config.dir.input}/components/**/*.webc`],
            },
        },
        {
            plugin: EleventyVitePlugin,
            options: {
                viteOptions: viteConfig,
            },
        },
        {
            plugin: feedPlugin,
            options: {
                type: "atom",
                outputPath: "/feed.xml",
                collection: {
                    name: "photos",
                    limit: 10,
                },
                metadata: {
                    language: "en",
                    title: site.title,
                    subtitle: site.description,
                    base: site.url,
                    author: {
                        name: site.author,
                    },
                },
            },
        },
        {
            plugin: eleventyImageTransformPlugin,
            options: {
                htmlOptions: {
                    imgAttributes: {
                        loading: "lazy",
                        decoding: "async",
                    },
                    pictureAttributes: {},
                },
            },
        },
    ]

    for (const plugin of plugins) {
        config.addPlugin(plugin.plugin, plugin.options)
    }

    config.htmlTransformer.addUrlTransform(
        "html",
        function (urlInMarkup) {
            const base = this.baseHref || config.pathPrefix

            if (base === "/") {
                return urlInMarkup
            }

            return applyHtmlBasePathPrefix(urlInMarkup.trim(), {
                base,
                pageUrl: this.url,
                pathPrefix: config.pathPrefix,
            })
        },
        {
            priority: -2,
            enabled: (context) => Boolean(context.baseHref) || config.pathPrefix !== "/",
        },
    )
}
