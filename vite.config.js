import { resolve } from "node:path"
import { defineConfig } from "vite"

export const assetEntry = "src/assets/site.js"

export default defineConfig({
    appType: "custom",
    publicDir: false,
    server: {
        watch: {
            ignored: ["**/dist/**"],
        },
    },
    build: {
        assetsDir: ".",
        emptyOutDir: true,
        manifest: true,
        outDir: "dist/assets",
        rollupOptions: {
            input: {
                site: resolve(assetEntry),
            },
            output: {
                assetFileNames: "[name].[hash][extname]",
                chunkFileNames: "[name].[hash].js",
                entryFileNames: "[name].[hash].js",
            },
        },
    },
})
