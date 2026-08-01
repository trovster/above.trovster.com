import sharp from "sharp"

const BLURHASH_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~"

const DEFAULT_COMPONENT_X = 4
const DEFAULT_COMPONENT_Y = 3
const DEFAULT_RESIZE_LIMIT = 100
const BYTES_PER_PIXEL = 4

export class BlurhashValidationError extends Error {
    constructor(message) {
        super(message)
        this.name = "BlurhashValidationError"
    }
}

const encodeBase83 = (value, length) => {
    let result = ""

    for (let index = 1; index <= length; index += 1) {
        const digit = Math.floor(value / 83 ** (length - index)) % 83
        result += BLURHASH_CHARACTERS[digit]
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

const encodeDc = ([red, green, blue]) => {
    const redValue = linearToSrgb(red)
    const greenValue = linearToSrgb(green)
    const blueValue = linearToSrgb(blue)

    return (redValue << 16) + (greenValue << 8) + blueValue
}

const encodeAc = ([red, green, blue], maximumValue) => {
    const redValue = Math.floor(Math.max(0, Math.min(18, Math.floor(signPow(red / maximumValue, 0.5) * 9 + 9.5))))
    const greenValue = Math.floor(Math.max(0, Math.min(18, Math.floor(signPow(green / maximumValue, 0.5) * 9 + 9.5))))
    const blueValue = Math.floor(Math.max(0, Math.min(18, Math.floor(signPow(blue / maximumValue, 0.5) * 9 + 9.5))))

    return redValue * 19 * 19 + greenValue * 19 + blueValue
}

const multiplyBasisFunction = (pixels, width, height, basisFunction) => {
    let red = 0
    let green = 0
    let blue = 0
    const bytesPerRow = width * BYTES_PER_PIXEL

    for (let x = 0; x < width; x += 1) {
        const xOffset = x * BYTES_PER_PIXEL

        for (let y = 0; y < height; y += 1) {
            const pixelOffset = xOffset + y * bytesPerRow
            const basis = basisFunction(x, y)

            red += basis * srgbToLinear(pixels[pixelOffset])
            green += basis * srgbToLinear(pixels[pixelOffset + 1])
            blue += basis * srgbToLinear(pixels[pixelOffset + 2])
        }
    }

    const scale = 1 / (width * height)

    return [red * scale, green * scale, blue * scale]
}

export const encodeBlurhash = (pixels, width, height, componentX = DEFAULT_COMPONENT_X, componentY = DEFAULT_COMPONENT_Y) => {
    if (componentX < 1 || componentX > 9 || componentY < 1 || componentY > 9) {
        throw new BlurhashValidationError("BlurHash must have between 1 and 9 components")
    }

    if (width * height * BYTES_PER_PIXEL !== pixels.length) {
        throw new BlurhashValidationError("Width and height must match the pixels array")
    }

    const factors = []

    for (let y = 0; y < componentY; y += 1) {
        for (let x = 0; x < componentX; x += 1) {
            const normalisation = x === 0 && y === 0 ? 1 : 2

            factors.push(multiplyBasisFunction(pixels, width, height, (pixelX, pixelY) => normalisation * Math.cos((Math.PI * x * pixelX) / width) * Math.cos((Math.PI * y * pixelY) / height)))
        }
    }

    const [dc, ...ac] = factors
    const sizeFlag = componentX - 1 + (componentY - 1) * 9

    let hash = encodeBase83(sizeFlag, 1)

    if (ac.length === 0) {
        hash += encodeBase83(0, 1)
        hash += encodeBase83(encodeDc(dc), 4)

        return hash
    }

    const actualMaximumValue = Math.max(...ac.map((factor) => Math.max(...factor.map((value) => Math.abs(value)))))
    const quantisedMaximumValue = Math.floor(Math.max(0, Math.min(82, Math.floor(actualMaximumValue * 166 - 0.5))))
    const maximumValue = (quantisedMaximumValue + 1) / 166

    hash += encodeBase83(quantisedMaximumValue, 1)
    hash += encodeBase83(encodeDc(dc), 4)

    for (const factor of ac) {
        hash += encodeBase83(encodeAc(factor, maximumValue), 2)
    }

    return hash
}

export default async (file) => {
    const { data, info } = await sharp(file)
        .resize(DEFAULT_RESIZE_LIMIT, DEFAULT_RESIZE_LIMIT, {
            fit: "inside",
            withoutEnlargement: true,
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

    return encodeBlurhash(new Uint8ClampedArray(data), info.width, info.height, DEFAULT_COMPONENT_X, DEFAULT_COMPONENT_Y)
}
