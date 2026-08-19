import "pannellum/build/pannellum.js"
import dragCursorIcon from "../icons/cursor/arrows-pointing-out.svg?raw"
import { createPointerCursor, createPointerCursorTracker, supportsFinePointer } from "./pointer-cursor.js"

let panoramaObserver
let panoramaCursor

const parseSrcsetCandidates = (srcset) =>
    (srcset ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [url, descriptor] = entry.split(/\s+/)
            return { url, width: descriptor?.endsWith("w") ? Number.parseInt(descriptor, 10) : Number.NaN }
        })
        .filter((candidate) => candidate.url)

const collectSrcsets = (image) => [
    ...Array.from(image.closest("picture")?.querySelectorAll("source[srcset]") ?? [], (source) => source.srcset),
    image.srcset,
]

// A panorama viewer only ever shows a slice of the full equirectangular width, so
// always pick the largest generated variant. Relying on currentSrc/src would use
// whatever the lazy <img> resolved to — often the smallest (400w) file if the viewer
// initialises before the image loads, causing pixellation.
const largestPanoramaCandidate = (image) => {
    const candidates = collectSrcsets(image)
        .flatMap(parseSrcsetCandidates)
        .filter((candidate) => Number.isFinite(candidate.width))

    if (!candidates.length) {
        return null
    }

    return candidates.reduce((largest, candidate) => (candidate.width > largest.width ? candidate : largest)).url
}

const getPanoramaSource = (image) => largestPanoramaCandidate(image) || image.currentSrc || image.src || image.getAttribute("src")

const getPannellum = () => window.pannellum ?? globalThis.pannellum

const exposeViewer = (container, mount, viewer) => {
    Object.defineProperty(container, "panoramaViewer", {
        configurable: true,
        value: viewer,
    })

    Object.defineProperty(mount, "panoramaViewer", {
        configurable: true,
        value: viewer,
    })
}

const formatPanoramaState = (value) => (Number.isFinite(value) ? value.toFixed(3) : "")

const syncPanoramaState = (container, viewer) => {
    container.dataset.panoramaYaw = formatPanoramaState(viewer.getYaw?.())
    container.dataset.panoramaPitch = formatPanoramaState(viewer.getPitch?.())
    container.dataset.panoramaHfov = formatPanoramaState(viewer.getHfov?.())
}

const markPanoramaReady = (container, viewer) => {
    container.dataset.panoramaReady = "true"
    syncPanoramaState(container, viewer)
    requestAnimationFrame(() => viewer.resize())
}

const initPanoramaViewer = (container) => {
    if (container.dataset.panoramaInitialized === "true") {
        return
    }

    const mount = container.querySelector("[data-panorama-mount]")
    const image = container.querySelector("[data-panorama-image]")
    const source = image ? getPanoramaSource(image) : null
    const pannellum = getPannellum()

    if (!mount || !source || !pannellum?.viewer) {
        return
    }

    container.dataset.panoramaInitialized = "true"
    container.dataset.panoramaSrc = source

    try {
        const viewer = pannellum.viewer(mount, {
            autoLoad: true,
            compass: false,
            mouseZoom: false,
            panorama: source,
            showControls: false,
            showFullscreenCtrl: false,
            showZoomCtrl: false,
            pitch: -20,
            type: "equirectangular",
        })

        exposeViewer(container, mount, viewer)

        viewer.on("load", () => markPanoramaReady(container, viewer))
        viewer.on("animatefinished", () => syncPanoramaState(container, viewer))
        viewer.on("mouseup", () => syncPanoramaState(container, viewer))
        viewer.on("error", (message) => {
            container.dataset.panoramaError = String(message ?? "unknown")
        })

        requestAnimationFrame(() => {
            viewer.resize()

            if (viewer.isLoaded?.()) {
                markPanoramaReady(container, viewer)
            }
        })
    } catch (error) {
        container.dataset.panoramaInitialized = "false"
        container.dataset.panoramaError = error instanceof Error ? error.message : String(error)
    }
}

const getPanoramaObserver = () => {
    if (!("IntersectionObserver" in window)) {
        return null
    }

    if (!panoramaObserver) {
        panoramaObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) {
                        continue
                    }

                    initPanoramaViewer(entry.target)
                    panoramaObserver.unobserve(entry.target)
                }
            },
            {
                rootMargin: "800px 0px",
            },
        )
    }

    return panoramaObserver
}

const observePanoramaViewer = (container) => {
    const observer = getPanoramaObserver()

    if (!observer) {
        initPanoramaViewer(container)
        return
    }

    observer.observe(container)
}

const initPanoramaCursor = (root) => {
    if (!supportsFinePointer()) {
        return
    }

    const mounts = root.querySelectorAll("[data-panorama-mount]:not([data-panorama-cursor])")

    if (!mounts.length) {
        return
    }

    if (!panoramaCursor) {
        const cursor = createPointerCursor(dragCursorIcon)
        const tracker = createPointerCursorTracker(cursor)

        document.body.append(cursor)
        panoramaCursor = { cursor, tracker }

        window.addEventListener("pointerup", () => cursor.classList.remove("is-dragging"))
    }

    for (const mount of mounts) {
        mount.dataset.panoramaCursor = "true"
        mount.addEventListener("pointerenter", panoramaCursor.tracker.show)
        mount.addEventListener("pointermove", panoramaCursor.tracker.move)
        mount.addEventListener("pointerleave", panoramaCursor.tracker.hide)
        mount.addEventListener("pointerdown", () => panoramaCursor.cursor.classList.add("is-dragging"))
        mount.addEventListener("pointerup", () => panoramaCursor.cursor.classList.remove("is-dragging"))
        mount.addEventListener("pointercancel", () => panoramaCursor.cursor.classList.remove("is-dragging"))
    }
}

const initPanoramaViewers = (root = document) => {
    initPanoramaCursor(root)

    for (const container of root.querySelectorAll("[data-panorama-viewer]")) {
        observePanoramaViewer(container)
    }
}

export { initPanoramaViewers }
