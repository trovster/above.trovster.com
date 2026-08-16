import Swiper from "swiper"
import { Mousewheel, Navigation } from "swiper/modules"

import "swiper/css"

const carouselSelector = "[data-photo-carousel]"

export const initPhotoCarousel = () => {
    const carousels = document.querySelectorAll(carouselSelector)

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
