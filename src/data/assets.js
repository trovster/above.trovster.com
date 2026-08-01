import { existsSync, readFileSync } from "node:fs"

import { assetEntry } from "../../vite.config.js"

const manifestPath = new URL("../../dist/assets/.vite/manifest.json", import.meta.url)

const assetUrl = (file) => `/assets/${file}`

const readManifestEntry = () => {
    if (!existsSync(manifestPath)) {
        return null
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))

    return manifest[assetEntry] ?? null
}

export default () => {
    const isDev = ["serve", "watch"].includes(process.env.ELEVENTY_RUN_MODE)

    if (isDev) {
        return {
            dev: true,
            entry: `/${assetEntry}`,
            styles: [],
            scripts: [],
        }
    }

    const entry = readManifestEntry()

    return {
        dev: false,
        entry: null,
        styles: entry?.css?.map(assetUrl) ?? [],
        scripts: entry?.file ? [assetUrl(entry.file)] : [],
    }
}
