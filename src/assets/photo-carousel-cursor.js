import { createPointerCursor, createPointerCursorTracker, supportsFinePointer } from "./pointer-cursor.js"

const cursorTargetSelector = ".photo-carousel__item"
const cursorIconPath = "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6"

const getCarouselItemTarget = (target) => {
    if (!(target instanceof Element)) {
        return null
    }

    return target.closest(cursorTargetSelector)
}

export const initPhotoCarouselCursor = () => {
    if (!supportsFinePointer()) {
        return
    }

    if (!document.querySelector(cursorTargetSelector)) {
        return
    }

    const cursor = createPointerCursor(cursorIconPath)
    const tracker = createPointerCursorTracker(cursor)

    const showCursor = (event) => {
        const item = getCarouselItemTarget(event.target)
        const previousItem = getCarouselItemTarget(event.relatedTarget)

        if (item && item !== previousItem) {
            tracker.show(event)
        }
    }

    const hideCursor = (event) => {
        const item = getCarouselItemTarget(event.target)
        const nextItem = getCarouselItemTarget(event.relatedTarget)

        if (item && item !== nextItem) {
            tracker.hide()
        }
    }

    document.body.append(cursor)

    document.addEventListener("pointerleave", tracker.hide)

    document.addEventListener("pointermove", (event) => {
        if (getCarouselItemTarget(event.target)) {
            tracker.move(event)
        }
    })
    document.addEventListener("pointerover", showCursor)
    document.addEventListener("pointerout", hideCursor)
}
