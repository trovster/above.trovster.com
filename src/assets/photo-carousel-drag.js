const carouselSelector = ".photo-carousel > ol"
const dragThreshold = 6

const getCarousel = (target) => {
    if (!(target instanceof Element)) {
        return null
    }

    return target.closest(carouselSelector)
}

export const initPhotoCarouselDrag = () => {
    let active = null

    document.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "mouse" || event.button !== 0) {
            return
        }

        const ol = getCarousel(event.target)

        if (!ol) {
            return
        }

        active = {
            ol,
            pointerId: event.pointerId,
            startX: event.clientX,
            startScrollLeft: ol.scrollLeft,
            dragging: false,
        }
    })

    document.addEventListener("pointermove", (event) => {
        if (!active || event.pointerId !== active.pointerId) {
            return
        }

        const delta = event.clientX - active.startX

        if (!active.dragging && Math.abs(delta) > dragThreshold) {
            active.dragging = true
            active.ol.classList.add("is-dragging")
            document.body.classList.add("is-photo-carousel-dragging")
            active.ol.setPointerCapture(active.pointerId)
        }

        if (active.dragging) {
            event.preventDefault()
            active.ol.scrollLeft = active.startScrollLeft - delta
        }
    })

    const endDrag = (event) => {
        if (!active || event.pointerId !== active.pointerId) {
            return
        }

        const { ol, dragging, pointerId } = active

        if (dragging) {
            if (ol.hasPointerCapture(pointerId)) {
                ol.releasePointerCapture(pointerId)
            }

            ol.classList.remove("is-dragging")
            document.body.classList.remove("is-photo-carousel-dragging")

            const suppressClick = (clickEvent) => {
                clickEvent.preventDefault()
                clickEvent.stopPropagation()
            }

            ol.addEventListener("click", suppressClick, { capture: true, once: true })
        }

        active = null
    }

    document.addEventListener("pointerup", endDrag)
    document.addEventListener("pointercancel", endDrag)
}
