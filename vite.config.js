import { dirname, relative, resolve, sep } from "node:path"
import { defineConfig } from "vite"

const assetFileNames = (assetInfo) => {
    const original = assetInfo.originalFileNames?.[0]

    if (original) {
        const segments = relative(process.cwd(), dirname(original)).split(sep)
        const folder = segments.slice(1).join("/")

        if (folder) {
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
