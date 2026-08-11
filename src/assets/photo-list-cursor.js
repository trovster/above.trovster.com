const cursorScopeSelector = ".page--home [data-photo-list], .page--gallery:not(.page--360) [data-photo-list]"
const cursorTargetSelector = ".photo-card > a"

const supportsFinePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches

const createPhotoListCursor = () => {
    const cursor = document.createElement("div")

    cursor.className = "photo-list-cursor"
    cursor.setAttribute("aria-hidden", "true")
    cursor.innerHTML = `
        <div class="photo-list-cursor__circle">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M4.5 19.5 19.5 4.5m0 0H8.25m11.25 0v11.25" />
            </svg>
        </div>
    `

    return cursor
}

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

    const cursor = createPhotoListCursor()
    let frame = null
    let x = 0
    let y = 0

    const updatePosition = () => {
        cursor.style.setProperty("--photo-list-cursor-x", `${x}px`)
        cursor.style.setProperty("--photo-list-cursor-y", `${y}px`)
        frame = null
    }

    const queuePositionUpdate = (event) => {
        x = event.clientX
        y = event.clientY

        if (frame === null) {
            frame = window.requestAnimationFrame(updatePosition)
        }
    }

    const showCursor = (event) => {
        const link = getImageLinkTarget(event.target)
        const previousLink = getImageLinkTarget(event.relatedTarget)

        if (link && link !== previousLink) {
            queuePositionUpdate(event)
            cursor.classList.add("is-visible", "is-expanded")
        }
    }

    const hideCursor = (event) => {
        const link = getImageLinkTarget(event.target)
        const nextLink = getImageLinkTarget(event.relatedTarget)

        if (link && link !== nextLink) {
            cursor.classList.remove("is-visible", "is-expanded")
        }
    }

    document.body.append(cursor)

    scope.addEventListener("pointerleave", () => {
        cursor.classList.remove("is-visible", "is-expanded")
    })

    scope.addEventListener("pointermove", (event) => {
        if (getImageLinkTarget(event.target)) {
            queuePositionUpdate(event)
        }
    })
    scope.addEventListener("pointerover", showCursor)
    scope.addEventListener("pointerout", hideCursor)
}
