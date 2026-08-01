import { initBlurhashPlaceholders } from "./blurhash.js"
import { initInfinitePhotoPagination } from "./infinite-scroll.js"

if (typeof document !== "undefined" && typeof window !== "undefined") {
    initBlurhashPlaceholders()
    initInfinitePhotoPagination()
}
