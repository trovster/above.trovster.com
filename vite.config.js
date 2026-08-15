import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
    appType: "mpa",
    publicDir: false,
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
                assetFileNames: "assets/[name].[hash][extname]",
                chunkFileNames: "assets/[name].[hash].js",
                entryFileNames: "assets/[name].[hash].js",
            },
        },
    },
})
