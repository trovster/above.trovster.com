let mapsPromise = null

/**
 * Load the Google Maps JavaScript API once, sharing a single promise across
 * every map on the page.
 *
 * @param {String} apiKey - Google Maps API key
 * @returns {Promise<Object>} the `google.maps` namespace
 */
const loadGoogleMaps = (apiKey) => {
    if (mapsPromise) {
        return mapsPromise
    }

    if (!apiKey) {
        return Promise.reject(new Error("Missing Google Maps API key"))
    }

    if (window.google?.maps) {
        mapsPromise = Promise.resolve(window.google.maps)

        return mapsPromise
    }

    mapsPromise = new Promise((resolve, reject) => {
        const callbackName = "__initAboveGoogleMaps"

        window[callbackName] = () => {
            delete window[callbackName]
            resolve(window.google.maps)
        }

        const script = document.createElement("script")

        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=marker&callback=${callbackName}`
        script.async = true
        script.addEventListener("error", () => reject(new Error("Failed to load Google Maps")))

        document.head.append(script)
    })

    return mapsPromise
}

export { loadGoogleMaps }
