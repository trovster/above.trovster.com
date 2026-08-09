import { defineConfig } from "vite"

export default defineConfig({
    appType: "mpa",
    publicDir: false,
    build: {
        assetsDir: "assets",
        emptyOutDir: true,
        rolldownOptions: {
            output: {
                assetFileNames: "assets/[name].[hash][extname]",
                chunkFileNames: "assets/[name].[hash].js",
                entryFileNames: "assets/[name].[hash].js",
            },
        },
    },
})
