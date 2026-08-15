import { loadGoogleMaps } from "./google-maps-loader.js"
import { createPinIcon } from "./map-marker-icon.js"
import { darkMapStyle } from "./map-style.js"

const MARKER_SIZE = 72

const createPinContent = (icon) => {
    const image = document.createElement("img")

    image.src = icon.url
    image.alt = ""
    image.width = icon.width
    image.height = icon.height
    image.style.display = "block"

    return image
}

const initPhotoLocationMap = async (container) => {
    const latitude = Number.parseFloat(container.dataset.lat)
    const longitude = Number.parseFloat(container.dataset.lng)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return
    }

    const position = { lat: latitude, lng: longitude }
    const title = container.dataset.title ?? ""

    try {
        await loadGoogleMaps(container.dataset.apiKey)

        const mapId = container.dataset.mapId || undefined
        const { AdvancedMarkerElement } = mapId ? await google.maps.importLibrary("marker") : {}

        const map = new google.maps.Map(container, {
            center: position,
            zoom: 13,
            mapId,
            styles: mapId ? undefined : darkMapStyle,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "cooperative",
            clickableIcons: false,
        })

        const icon = createPinIcon(container.dataset.thumbnail || null, { size: MARKER_SIZE })

        if (AdvancedMarkerElement) {
            // eslint-disable-next-line no-new
            new AdvancedMarkerElement({ map, position, title, content: createPinContent(icon) })
        } else {
            // eslint-disable-next-line no-new
            new google.maps.Marker({
                map,
                position,
                title,
                icon: {
                    url: icon.url,
                    scaledSize: new google.maps.Size(icon.width, icon.height),
                    anchor: new google.maps.Point(icon.anchor.x, icon.anchor.y),
                },
            })
        }
    } catch (error) {
        console.error(error)
    }
}

/**
 * Initialise every small, single-marker location map on the page (used on
 * individual photo pages).
 *
 * @param {ParentNode} [root]
 */
const initPhotoLocationMaps = (root = document) => {
    for (const container of root.querySelectorAll("[data-photo-location-map]")) {
        initPhotoLocationMap(container)
    }
}

export { initPhotoLocationMaps }
