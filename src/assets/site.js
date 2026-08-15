import "pannellum/build/pannellum.css"
import "./site.css"
import { initBlurhashPlaceholders } from "./blurhash.js"
import { initPanoramaViewers } from "./panorama.js"
import { initPhotoListCursor } from "./photo-list-cursor.js"

if (typeof document !== "undefined" && typeof window !== "undefined") {
    initBlurhashPlaceholders()
    initPanoramaViewers()
    initPhotoListCursor()

    if (document.querySelector("[data-photo-map]")) {
        import("./photo-map.js").then(({ initPhotoMap }) => initPhotoMap())
    }

    if (document.querySelector("[data-photo-location-map]")) {
        import("./photo-location-map.js").then(({ initPhotoLocationMaps }) => initPhotoLocationMaps())
    }
}
