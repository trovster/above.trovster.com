// A dark map theme matching the site's colour palette (see the --color-*
// custom properties in site.css), since Google Maps tiles are canvas/WebGL
// rendered and can't be dark-mode adjusted with a CSS filter.
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#0b0f10" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#020303" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#aaa398" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2a2f31" }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#111518" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#161b16" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2124" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0b0f10" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a2f1c" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f1d28f" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#aaa398" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#05181f" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4c6b74" }] },
]

export { darkMapStyle }
