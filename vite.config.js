import { dirname, resolve } from "node:path"
import { defineConfig } from "vite"

const assetFileNames = (assetInfo) => {
    const original = assetInfo.originalFileNames?.[0]

    if (original) {
        const folder = dirname(original)

        if (folder && folder !== ".") {
            return `${folder}/[name].[hash][extname]`
        }
    }

    return "assets/[name].[hash][extname]"
}

export default defineConfig({
    appType: "mpa",
    publicDir: "public",
    server: {
        mode: "development",
        middlewareMode: true,
        allowedHosts: [
            "above.trovster.test",
        ],
        fs: {
            allow: [resolve(".")],
        },
    },
    resolve: {
        alias: {
            "/assets/site.js": resolve("src/assets/site.js"),
        },
    },
    build: {
        assetsDir: "assets",
        mode: "production",
        emptyOutDir: true,
        sourcemap: false,
        manifest: true,
        rolldownOptions: {
            output: {
                assetFileNames,
                chunkFileNames: "assets/[name].[hash].js",
                entryFileNames: "assets/[name].[hash].js",
            },
        },
    },
})
