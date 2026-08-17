const frontMatter = /^---\s*[\s\S]*?\s*---/

const stripMarkdown = (value = "") =>
    String(value)
        .replace(frontMatter, "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/<[^>]+>/g, " ")
        .replace(/[#>*_~|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

const truncate = (value, length = 255) => {
    if (value.length <= length) {
        return value
    }

    return `${value.slice(0, length - 3).trimEnd()}...`
}

const isEnabled = (value) => Number(value) === 1

const hasEnabledPanorama = (panorama) => panorama && typeof panorama === "object" && isEnabled(panorama.enabled) && panorama.src

export default {
    permalink: ({ enabled, page }) => (isEnabled(enabled) ? `/${page.fileSlug}/` : false),
    eleventyComputed: {
        layout: ({ enabled }) => (isEnabled(enabled) ? "photo.webc" : false),
        eleventyExcludeFromCollections: ({ enabled, panorama }) => !isEnabled(enabled) && !hasEnabledPanorama(panorama),
        photo: async ({ collections, enabled, page }) => {
            if (!isEnabled(enabled)) {
                return null
            }

            const photos = await Promise.all(collections.photos ?? [])

            return photos.find((photo) => photo?.url === page.url) ?? null
        },
        title: ({ title }) => title,
        description: ({ page, alt }) => truncate(stripMarkdown(page.rawInput) || alt || ""),
        bodyClass: () => "page page--photo",
    },
}
