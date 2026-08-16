import path from "node:path"

import blurhash from "../utils/blurhash.js"
import exif from "../utils/exif.js"
import createMarkerThumbnail from "../utils/marker-thumbnail.js"
import palette from "../utils/palette.js"
import siblings from "../utils/photo-siblings.js"
import buildViewImages, { hasEnabledImages } from "../utils/view-images.js"

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

    return {
        latitude,
        longitude,
        coordinates: `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`,
        linkUrl: `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`,
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

const findViews = (views, photo) => views.find((view) => view.page.fileSlug === photo.page.fileSlug) ?? null

const buildViewsReference = async (view) => {
    if (!view) {
        return null
    }

    // @todo temporarily disabled view carousel on photos page.
    return null

    return {
        url: view.url,
        title: view.data.title,
        images: await buildViewImages(view),
    }
}

const createPhotoCollection = async (api, { glob, panoramaGlob, viewsGlob }) => {
    const photos = api.getFilteredByGlob(glob).filter((photo) => isEnabled(photo.data.enabled))

    const panoramas = panoramaGlob ? api.getFilteredByGlob(panoramaGlob).filter((photo) => isEnabled(photo.data.enabled)) : []

    const views = viewsGlob
        ? api.getFilteredByGlob(viewsGlob).filter((view) => isEnabled(view.data.enabled) && hasEnabledImages(view.data.images))
        : []

    return Promise.all(
        photos.map(async (photo, index) => {
            const file = path.join(path.dirname(photo.inputPath), photo.data.src)
            const src = path.join(path.dirname(photo.filePathStem), photo.data.src)
            const { previous, next } = siblings(photos, index)
            const map = buildMap(photo.data.location)

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
                    map,
                    thumbnail: map ? await createMarkerThumbnail(file) : null,
                    src,
                    previous,
                    next,
                    panorama: buildPanoramaReference(findPanorama(panoramas, photo)),
                    views: await buildViewsReference(findViews(views, photo)),
                },
            }
        }),
    )
}

export default createPhotoCollection
