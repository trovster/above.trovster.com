import "pannellum/build/pannellum.css"
import "./site.css"
import { initBlurhashPlaceholders } from "./blurhash.js"
import { initPanoramaViewers } from "./panorama.js"
import { initPhotoListCursor } from "./photo-list-cursor.js"

if (typeof document !== "undefined" && typeof window !== "undefined") {
    initBlurhashPlaceholders()
    initPanoramaViewers()
    initPhotoListCursor()
}
