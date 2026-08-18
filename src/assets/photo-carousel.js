import Swiper from "swiper"
import { Mousewheel, Navigation } from "swiper/modules"

import "swiper/css"

const carouselSelector = "[data-photo-carousel]"
const popoverSelector = ".gallery-popover"

const setupPopoverKeyboardNavigation = () => {
    document.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return
        }

        const current = document.querySelector(`${popoverSelector}:popover-open`)

        if (!current) {
            return
        }

        const carousel = current.closest(carouselSelector)

        if (!carousel) {
            return
        }

        const popovers = [...carousel.querySelectorAll(popoverSelector)]
        const nextIndex = popovers.indexOf(current) + (event.key === "ArrowLeft" ? -1 : 1)
        const target = popovers[nextIndex]

        if (!target) {
            return
        }

        event.preventDefault()

        current.hidePopover()
        target.showPopover()
        target.querySelector(`${popoverSelector}__close`)?.focus()
        // carousel.swiper?.slideTo(nextIndex)
    })
}

export const initPhotoCarousel = () => {
    const carousels = document.querySelectorAll(carouselSelector)

    setupPopoverKeyboardNavigation()

    carousels.forEach((carousel) => {
        new Swiper(carousel, {
            modules: [Navigation, Mousewheel],
            slidesPerView: "auto",
            spaceBetween: 16,
            grabCursor: true,
            centeredSlides: true,
            centeredSlidesBounds: true,
            navigation: {
                prevEl: carousel.querySelector(".swiper-button-prev"),
                nextEl: carousel.querySelector(".swiper-button-next"),
            },
            mousewheel: {
                forceToAxis: true,
                releaseOnEdges: true,
            },
            breakpoints: {
                544: {
                    centeredSlides: false,
                    centeredSlidesBounds: false,
                },
            },
        })
    })
}
