// A classic teardrop "place" pin (Material Design's well-known `place` glyph),
// authored in a 24x24 box: a circular head sitting above a pointed tail that
// touches down on the exact coordinate at y=22. The viewBox height is trimmed
// to 22 (not 24) so the rendered image's bottom edge lands exactly on the
// tip — that lets `AdvancedMarkerElement`'s default bottom-centre content
// anchor line up correctly, and keeps the classic-marker anchor math simple.
const PIN_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
const PIN_WIDTH = 24
const PIN_HEIGHT = 22
const PIN_HEAD_CENTER_X = 12
const PIN_HEAD_CENTER_Y = 9

const iconCache = new Map()

const escapeForAttribute = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;")

/**
 * Build a map-pin marker icon with a circular photo thumbnail set into its
 * head, as a `data:image/svg+xml` URL. `photoUrl` should be a `data:` URL
 * (e.g. a pre-cropped base64 thumbnail) — SVGs used as marker icons are
 * rendered in an "image" context, which browsers prevent from fetching
 * further external resources, so a live http(s) URL here will render blank.
 *
 * @param {String|null} photoUrl - a `data:` image URL, or null for no photo
 * @param {Object} options
 * @param {Number} options.size - icon width, in pixels (height follows the
 *   pin's own aspect ratio)
 * @param {String} options.fill - pin head fill colour (behind the photo)
 * @param {String} options.stroke - pin outline + photo ring colour
 * @param {Number} options.photoRadius - photo circle radius, in viewBox units
 * @returns {{url: String, width: Number, height: Number, anchor: {x: Number, y: Number}}}
 *   the icon URL, its rendered pixel size, and the point (in icon pixel
 *   space) that should sit on the map coordinate (the pin's tip)
 */
const createPinIcon = (photoUrl, { size = 56, fill = "#111518", stroke = "#f1d28f", photoRadius = 5 } = {}) => {
    const cacheKey = `${photoUrl ?? "blank"}__${size}`

    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey)
    }

    const height = size * (PIN_HEIGHT / PIN_WIDTH)
    const href = photoUrl ? escapeForAttribute(photoUrl) : null

    const clipMarkup = href ? `<clipPath id="photo-clip"><circle cx="${PIN_HEAD_CENTER_X}" cy="${PIN_HEAD_CENTER_Y}" r="${photoRadius}"/></clipPath>` : ""

    const imageMarkup = href
        ? `<image
               href="${href}"
               x="${PIN_HEAD_CENTER_X - photoRadius}"
               y="${PIN_HEAD_CENTER_Y - photoRadius}"
               width="${photoRadius * 2}"
               height="${photoRadius * 2}"
               preserveAspectRatio="xMidYMid slice"
               clip-path="url(#photo-clip)"
           />`
        : ""

    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">` +
        `<path d="${PIN_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>` +
        `<defs>${clipMarkup}</defs>` +
        imageMarkup +
        `<circle cx="${PIN_HEAD_CENTER_X}" cy="${PIN_HEAD_CENTER_Y}" r="${photoRadius}" fill="none" stroke="${stroke}" stroke-width="1"/>` +
        `</svg>`

    const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        width: size,
        height,
        anchor: { x: size / 2, y: height },
    }

    iconCache.set(cacheKey, icon)

    return icon
}

export { createPinIcon }
