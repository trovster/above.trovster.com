import { createPointerCursor, createPointerCursorTracker, supportsFinePointer } from "./pointer-cursor.js"

const cursorScopeSelector = ".page--home [data-photo-list], .page--gallery:not(.page--360) [data-photo-list]"
const cursorTargetSelector = ".photo-card > a"
const cursorIconPath = "M4.5 19.5 19.5 4.5m0 0H8.25m11.25 0v11.25"

const getImageLinkTarget = (target) => {
    if (!(target instanceof Element)) {
        return null
    }

    const link = target.closest(cursorTargetSelector)

    return link?.querySelector("img") ? link : null
}

export const initPhotoListCursor = () => {
    if (!supportsFinePointer()) {
        return
    }

    const scope = document.querySelector(cursorScopeSelector)

    if (!scope) {
        return
    }

    const cursor = createPointerCursor(cursorIconPath)
    const tracker = createPointerCursorTracker(cursor)

    const showCursor = (event) => {
        const link = getImageLinkTarget(event.target)
        const previousLink = getImageLinkTarget(event.relatedTarget)

        if (link && link !== previousLink) {
            tracker.show(event)
        }
    }

    const hideCursor = (event) => {
        const link = getImageLinkTarget(event.target)
        const nextLink = getImageLinkTarget(event.relatedTarget)

        if (link && link !== nextLink) {
            tracker.hide()
        }
    }

    document.body.append(cursor)

    scope.addEventListener("pointerleave", tracker.hide)

    scope.addEventListener("pointermove", (event) => {
        if (getImageLinkTarget(event.target)) {
            tracker.move(event)
        }
    })
    scope.addEventListener("pointerover", showCursor)
    scope.addEventListener("pointerout", hideCursor)
}
