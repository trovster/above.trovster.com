export default {
    apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    // Optional: a Map ID from the Google Cloud Console (Maps Platform > Map
    // Management), required to use `AdvancedMarkerElement`. Without one, maps
    // fall back to the (still fully supported, non-deprecated-for-removal)
    // classic `google.maps.Marker`.
    mapId: process.env.GOOGLE_MAPS_MAP_ID ?? "",
}
