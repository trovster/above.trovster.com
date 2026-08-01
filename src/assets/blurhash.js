const BLURHASH_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~"

const decode83 = (value) => {
    let result = 0

    for (const character of value) {
        result = result * 83 + BLURHASH_CHARACTERS.indexOf(character)
    }

    return result
}

const srgbToLinear = (value) => {
    const scaled = value / 255

    if (scaled <= 0.04045) {
        return scaled / 12.92
    }

    return ((scaled + 0.055) / 1.055) ** 2.4
}

const linearToSrgb = (value) => {
    const scaled = Math.max(0, Math.min(1, value))

    if (scaled <= 0.0031308) {
        return Math.trunc(scaled * 12.92 * 255 + 0.5)
    }

    return Math.trunc((1.055 * scaled ** (1 / 2.4) - 0.055) * 255 + 0.5)
}

const signPow = (value, exponent) => {
    if (value === 0) {
        return 0
    }

    return Math.sign(value) * Math.abs(value) ** exponent
}

const decodeDc = (value) => {
    const red = value >> 16
    const green = (value >> 8) & 255
    const blue = value & 255

    return [srgbToLinear(red), srgbToLinear(green), srgbToLinear(blue)]
}

const decodeAc = (value, maximumValue) => {
    const red = Math.floor(value / (19 * 19))
    const green = Math.floor(value / 19) % 19
    const blue = value % 19

    return [signPow((red - 9) / 9, 2) * maximumValue, signPow((green - 9) / 9, 2) * maximumValue, signPow((blue - 9) / 9, 2) * maximumValue]
}

const decodeBlurhash = (blurhash, width, height, punch = 1) => {
    if (!blurhash || blurhash.length < 6) {
        throw new Error("The blurhash string must be at least 6 characters")
    }

    const sizeFlag = decode83(blurhash[0])
    const componentY = Math.floor(sizeFlag / 9) + 1
    const componentX = (sizeFlag % 9) + 1

    if (blurhash.length !== 4 + 2 * componentX * componentY) {
        throw new Error("The blurhash string has an invalid length")
    }

    const maximumValue = (decode83(blurhash[1]) + 1) / 166
    const colors = new Array(componentX * componentY)

    for (let index = 0; index < colors.length; index += 1) {
        if (index === 0) {
            colors[index] = decodeDc(decode83(blurhash.slice(2, 6)))
            continue
        }

        colors[index] = decodeAc(decode83(blurhash.slice(4 + index * 2, 6 + index * 2)), maximumValue * punch)
    }

    const pixels = new Uint8ClampedArray(width * height * 4)
    const bytesPerRow = width * 4

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            let red = 0
            let green = 0
            let blue = 0

            for (let componentYIndex = 0; componentYIndex < componentY; componentYIndex += 1) {
                const basisY = Math.cos((Math.PI * y * componentYIndex) / height)

                for (let componentXIndex = 0; componentXIndex < componentX; componentXIndex += 1) {
                    const basis = Math.cos((Math.PI * x * componentXIndex) / width) * basisY
                    const color = colors[componentXIndex + componentYIndex * componentX]

                    red += color[0] * basis
                    green += color[1] * basis
                    blue += color[2] * basis
                }
            }

            const pixelOffset = x * 4 + y * bytesPerRow

            pixels[pixelOffset] = linearToSrgb(red)
            pixels[pixelOffset + 1] = linearToSrgb(green)
            pixels[pixelOffset + 2] = linearToSrgb(blue)
            pixels[pixelOffset + 3] = 255
        }
    }

    return pixels
}

const hidePlaceholder = (canvas) => {
    canvas.style.opacity = "0"

    window.setTimeout(() => {
        canvas.remove()
    }, 300)
}

const paintBlurhash = (canvas) => {
    const hash = canvas.dataset.blurhash
    const width = Number.parseInt(canvas.dataset.blurhashWidth ?? "32", 10)
    const height = Number.parseInt(canvas.dataset.blurhashHeight ?? "32", 10)

    if (!hash || Number.isNaN(width) || Number.isNaN(height)) {
        canvas.remove()
        return
    }

    const context = canvas.getContext("2d")

    if (!context) {
        canvas.remove()
        return
    }

    const pixels = decodeBlurhash(hash, width, height)

    canvas.width = width
    canvas.height = height

    context.putImageData(new ImageData(pixels, width, height), 0, 0)
}

export const initBlurhashPlaceholders = (root = document) => {
    const canvases = root.querySelectorAll("canvas[data-blurhash]")

    for (const canvas of canvases) {
        try {
            paintBlurhash(canvas)
        } catch {
            canvas.remove()
            continue
        }

        const image = canvas.parentElement?.querySelector("img")

        if (!image) {
            continue
        }

        const removePlaceholder = () => hidePlaceholder(canvas)

        if (image.complete) {
            removePlaceholder()
            continue
        }

        image.addEventListener("load", removePlaceholder, { once: true })
        image.addEventListener("error", removePlaceholder, { once: true })
    }
}
