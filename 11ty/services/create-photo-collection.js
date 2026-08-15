import path from "node:path"

import blurhash from "../utils/blurhash.js"
import exif from "../utils/exif.js"
import palette from "../utils/palette.js"
import siblings from "../utils/photo-siblings.js"

const toCoordinate = (value) => {
    if (typeof value === "number") {
        return value
    }

    if (typeof value === "string") {
        return Number.parseFloat(value)
    }

    return Number.NaN
}

const formatCoordinate = (value) => value.toFixed(4)

const isEnabled = (value) => Number(value) === 1

const normalizeMeta = (meta) => {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
        return []
    }

    return Object.entries(meta)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
        .map(([key, value]) => ({
            key,
            value: String(value),
        }))
}

const buildMap = (location) => {
    if (!location) {
        return null
    }

    const latitude = toCoordinate(location.latitude ?? location.lat)
    const longitude = toCoordinate(location.longitude ?? location.lng ?? location.lon)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null
    }

    const span = Number.isFinite(Number(location.span)) ? Number(location.span) : 0.03
    const west = longitude - span
    const south = latitude - span
    const east = longitude + span
    const north = latitude + span
    const marker = `${latitude.toFixed(6)},${longitude.toFixed(6)}`
    const bbox = `${west.toFixed(6)},${south.toFixed(6)},${east.toFixed(6)},${north.toFixed(6)}`

    return {
        latitude,
        longitude,
        span,
        coordinates: `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`,
        embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`,
        linkUrl: `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=14/${latitude.toFixed(6)}/${longitude.toFixed(6)}`,
    }
}

const findPanorama = (panoramas, photo) => panoramas.find((panorama) => panorama.page.fileSlug === photo.page.fileSlug) ?? null

const buildPanoramaReference = (panorama) => {
    if (!panorama) {
        return null
    }

    return {
        url: panorama.url,
        title: panorama.data.title,
    }
}

const createPhotoCollection = async (api, { glob, panoramaGlob }) => {
    const photos = api.getFilteredByGlob(glob).filter((photo) => isEnabled(photo.data.enabled))

    const panoramas = panoramaGlob ? api.getFilteredByGlob(panoramaGlob).filter((photo) => isEnabled(photo.data.enabled)) : []

    return Promise.all(
        photos.map(async (photo, index) => {
            const file = path.join(path.dirname(photo.inputPath), photo.data.src)
            const src = path.join(path.dirname(photo.filePathStem), photo.data.src)
            const { previous, next } = siblings(photos, index)

            return {
                url: photo.url,
                date: photo.date,
                data: {
                    ...photo.data,
                    id: photo.page.fileSlug,
                    blurhash: await blurhash(file),
                    palette: await palette(file),
                    exif: await exif(file),
                    meta: normalizeMeta(photo.data.meta),
                    map: buildMap(photo.data.location),
                    src,
                    previous,
                    next,
                    panorama: buildPanoramaReference(findPanorama(panoramas, photo)),
                },
            }
        }),
    )
}

export default createPhotoCollection
