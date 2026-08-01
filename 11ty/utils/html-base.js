import { EleventyHtmlBasePlugin } from "@11ty/eleventy"

function normalizePathPrefix(pathPrefix) {
    if (!pathPrefix || pathPrefix === "/") {
        return "/"
    }

    let normalized = pathPrefix

    if (!normalized.startsWith("/")) {
        normalized = `/${normalized}`
    }

    if (!normalized.endsWith("/")) {
        normalized = `${normalized}/`
    }

    return normalized
}

function stripRepeatedPathPrefix(url, pathPrefix) {
    if (!url?.startsWith("/")) {
        return url
    }

    const normalizedPathPrefix = normalizePathPrefix(pathPrefix)

    if (normalizedPathPrefix === "/") {
        return url
    }

    const prefix = normalizedPathPrefix.slice(0, -1)

    if (url === prefix || url === normalizedPathPrefix) {
        return "/"
    }

    while (url.startsWith(`${prefix}/`)) {
        url = url.slice(prefix.length)
    }

    return url
}

export function applyHtmlBasePathPrefix(url, { base, pageUrl, pathPrefix } = {}) {
    const normalizedUrl = stripRepeatedPathPrefix(url, pathPrefix)

    return EleventyHtmlBasePlugin.applyBaseToUrl(normalizedUrl, base, {
        pageUrl,
        pathPrefix,
    })
}
