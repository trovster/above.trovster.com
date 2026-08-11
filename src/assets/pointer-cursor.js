export const supportsFinePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches

export const createPointerCursor = (iconPath) => {
    const cursor = document.createElement("div")

    cursor.className = "pointer-cursor"
    cursor.setAttribute("aria-hidden", "true")
    cursor.innerHTML = `
        <div class="pointer-cursor__circle">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="${iconPath}" />
            </svg>
        </div>
    `

    return cursor
}

export const createPointerCursorTracker = (cursor) => {
    let frame = null
    let x = 0
    let y = 0

    const updatePosition = () => {
        cursor.style.setProperty("--pointer-cursor-x", `${x}px`)
        cursor.style.setProperty("--pointer-cursor-y", `${y}px`)
        frame = null
    }

    const move = (event) => {
        x = event.clientX
        y = event.clientY

        if (frame === null) {
            frame = window.requestAnimationFrame(updatePosition)
        }
    }

    return {
        hide: () => cursor.classList.remove("is-visible", "is-expanded", "is-dragging"),
        move,
        show: (event) => {
            move(event)
            cursor.classList.add("is-visible", "is-expanded")
        },
    }
}
