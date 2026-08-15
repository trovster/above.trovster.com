import { MarkerClusterer } from "@googlemaps/markerclusterer"
import { loadGoogleMaps } from "./google-maps-loader.js"
import { createPinIcon } from "./map-marker-icon.js"
import { darkMapStyle } from "./map-style.js"

const MARKER_SIZE = 72
const CLUSTER_SIZE = 48
const MAX_INITIAL_ZOOM = 15
const FIT_BOUNDS_PADDING = 48

const getPhotoUrl = (image) => image?.currentSrc || image?.src || null

const readEntries = (root) =>
    [...root.querySelectorAll("[data-map-photo-list] > li")]
        .map((item) => {
            const latitude = Number.parseFloat(item.dataset.lat)
            const longitude = Number.parseFloat(item.dataset.lng)

            if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
                return null
            }

            return {
                id: item.dataset.id,
                title: item.dataset.title ?? "",
                url: item.dataset.url ?? "#",
                thumbnail: item.dataset.thumbnail || null,
                position: { lat: latitude, lng: longitude },
                image: item.querySelector("img"),
            }
        })
        .filter(Boolean)

const buildClusterIconUrl = (count) => {
    const radius = CLUSTER_SIZE / 2
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CLUSTER_SIZE}" height="${CLUSTER_SIZE}">` +
        `<circle cx="${radius}" cy="${radius}" r="${radius - 2}" fill="#111518" stroke="#f1d28f" stroke-width="3" />` +
        `<text x="${radius}" y="${radius + 7}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700" fill="#f1d28f" text-anchor="middle">${count}</text>` +
        `</svg>`

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

class BrandClusterRenderer {
    render({ count, position }) {
        return new google.maps.Marker({
            position,
            icon: {
                url: buildClusterIconUrl(count),
                scaledSize: new google.maps.Size(CLUSTER_SIZE, CLUSTER_SIZE),
                anchor: new google.maps.Point(CLUSTER_SIZE / 2, CLUSTER_SIZE / 2),
            },
            zIndex: 1000 + count,
        })
    }
}

const openPopover = (root, entry, thumbnailSrc) => {
    const dialog = root.querySelector("#map-photo-popover")

    if (!dialog) {
        return
    }

    const image = dialog.querySelector("[data-map-popover-image]")
    const title = dialog.querySelector("[data-map-popover-title]")
    const link = dialog.querySelector("[data-map-popover-link]")

    if (image) {
        image.src = thumbnailSrc ?? ""
        image.alt = entry.title
    }

    if (title) {
        title.textContent = entry.title
    }

    if (link) {
        link.href = entry.url
    }

    dialog.showPopover?.()
}

const createPinContent = (icon) => {
    const image = document.createElement("img")

    image.src = icon.url
    image.alt = ""
    image.width = icon.width
    image.height = icon.height
    image.style.display = "block"

    return image
}

const createMarker = (root, entry, { AdvancedMarkerElement }) => {
    const icon = createPinIcon(entry.thumbnail, { size: MARKER_SIZE })

    // Markers are intentionally created without a `map` — MarkerClusterer
    // takes ownership of attaching/detaching them as it groups pins together.
    const marker = AdvancedMarkerElement
        ? new AdvancedMarkerElement({
              position: entry.position,
              title: entry.title,
              content: createPinContent(icon),
          })
        : new google.maps.Marker({
              position: entry.position,
              title: entry.title,
              icon: {
                  url: icon.url,
                  scaledSize: new google.maps.Size(icon.width, icon.height),
                  anchor: new google.maps.Point(icon.anchor.x, icon.anchor.y),
              },
          })

    marker.addListener("click", () => openPopover(root, entry, getPhotoUrl(entry.image)))

    return marker
}

/**
 * Initialise the full-page photo map: a large Google Map with a clustered,
 * pin marker (with a circular photo inset) for every photo that has a
 * location.
 *
 * @param {ParentNode} [root]
 */
const initPhotoMap = async (root = document) => {
    const container = root.querySelector("[data-photo-map]")

    if (!container) {
        return
    }

    const fallback = container.querySelector(".map-canvas__fallback")
    const entries = readEntries(root)

    if (!entries.length) {
        fallback?.replaceChildren("No mapped photos yet.")

        return
    }

    try {
        await loadGoogleMaps(container.dataset.apiKey)

        const mapId = container.dataset.mapId || undefined
        const { AdvancedMarkerElement } = mapId ? await google.maps.importLibrary("marker") : {}

        const map = new google.maps.Map(container, {
            center: entries[0].position,
            zoom: 11,
            mapId,
            // `styles` only applies to classic (non-vector) rendering; a
            // Map ID with a vector map style configured in the Cloud Console
            // takes over styling when AdvancedMarkerElement is in use.
            styles: mapId ? undefined : darkMapStyle,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
        })

        fallback?.remove()

        const markers = entries.map((entry) => createMarker(root, entry, { AdvancedMarkerElement }))

        // eslint-disable-next-line no-new
        new MarkerClusterer({ map, markers, renderer: new BrandClusterRenderer() })

        const bounds = new google.maps.LatLngBounds()

        for (const entry of entries) {
            bounds.extend(entry.position)
        }

        map.fitBounds(bounds, FIT_BOUNDS_PADDING)

        google.maps.event.addListenerOnce(map, "bounds_changed", () => {
            if (map.getZoom() > MAX_INITIAL_ZOOM) {
                map.setZoom(MAX_INITIAL_ZOOM)
            }
        })
    } catch (error) {
        if (fallback) {
            fallback.textContent = "The map could not be loaded."
        }

        console.error(error)
    }
}

export { initPhotoMap }
