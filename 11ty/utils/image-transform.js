import fs from "node:fs/promises"
import path from "node:path"

const watermarkPath = path.resolve(import.meta.dirname, "../../src/icons/above-logo.svg")
const watermarkSource = fs.readFile(watermarkPath, "utf8")

const watermarkOptions = Object.freeze({
    color: "#ffffff",
    margin: 0.0075,
    opacity: 1,
    strokeWidthAtFullSize: 2,
    width: 0.05,
})

const escapeXmlAttribute = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

const parseViewBox = (svg) => {
    const match = svg.match(/\sviewBox=(["'])(?<viewBox>.*?)\1/i)

    if (!match?.groups?.viewBox) {
        throw new Error("Watermark SVG must include a viewBox")
    }

    const values = match.groups.viewBox
        .trim()
        .split(/[\s,]+/)
        .map(Number)

    if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
        throw new Error("Watermark SVG viewBox must contain four numeric values")
    }

    const [, , width, height] = values

    if (width <= 0 || height <= 0) {
        throw new Error("Watermark SVG viewBox width and height must be positive")
    }

    return {
        height,
        value: values.join(" "),
        width,
    }
}

const stripSvgWrapper = (svg) =>
    svg
        .replace(/<\?xml[\s\S]*?\?>/gi, "")
        .replace(/<!doctype[\s\S]*?>/gi, "")
        .replace(/<svg\b[^>]*>/i, "")
        .replace(/<\/svg>\s*$/i, "")
        .trim()

const removePaintDeclarations = (svg) =>
    svg.replace(/\s(?:fill|stroke|stroke-width)=(["']).*?\1/gi, "").replace(/\sstyle=(["'])(.*?)\1/gi, (match, quote, style) => {
        const declarations = style
            .split(";")
            .map((declaration) => declaration.trim())
            .filter(Boolean)
            .filter((declaration) => !/^(?:fill|stroke|stroke-width)\s*:/i.test(declaration))

        return declarations.length ? ` style=${quote}${declarations.join("; ")}${quote}` : ""
    })

const addNonScalingStroke = (svg) => svg.replace(/<(path|circle|ellipse|line|polyline|polygon|rect)\b(?![^>]*\svector-effect=)/gi, '<$1 vector-effect="non-scaling-stroke"')

const createWatermark = async (imageWidth, imageHeight) => {
    const source = await watermarkSource
    const viewBox = parseViewBox(source)
    const margin = Math.max(1, Math.round(imageWidth * watermarkOptions.margin))
    const requestedWidth = Math.max(1, Math.round(imageWidth * watermarkOptions.width))
    const maxWidth = Math.max(1, imageWidth - margin * 2)
    const maxHeight = Math.max(1, imageHeight - margin * 2)
    const requestedHeight = Math.round((requestedWidth * viewBox.height) / viewBox.width)
    const scale = Math.min(1, maxWidth / requestedWidth, maxHeight / requestedHeight)
    const width = Math.max(1, Math.round(requestedWidth * scale))
    const height = Math.max(1, Math.round(requestedHeight * scale))
    const color = escapeXmlAttribute(watermarkOptions.color)
    const strokeWidth = (imageWidth / 2500) * watermarkOptions.strokeWidthAtFullSize
    const innerSvg = addNonScalingStroke(removePaintDeclarations(stripSvgWrapper(source)))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.value}" width="${width}" height="${height}">
<g fill="${color}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${watermarkOptions.opacity}">
${innerSvg}
</g>
</svg>`

    return {
        buffer: Buffer.from(svg),
        height,
        left: Math.max(margin, imageWidth - width - margin),
        top: Math.max(margin, imageHeight - height - margin),
        width,
    }
}

const sourcePath = (sharpInstance) => sharpInstance.options?.input?.file ?? null

const isPrimaryPhoto = (source) => source && path.basename(source, path.extname(source)).toLowerCase() === "image"

const formatPath = (file) => (file ? path.relative(process.cwd(), file) || "." : "<buffer>")

const transformImage = async (sharpInstance, { width, height, format }) => {
    const source = sourcePath(sharpInstance)
    const operations = [`resize ${width}x${height}`, `convert to ${format}`]

    if (isPrimaryPhoto(source)) {
        const watermark = await createWatermark(width, height)

        sharpInstance.resize({ width, withoutEnlargement: true }).composite([
            {
                input: watermark.buffer,
                left: watermark.left,
                top: watermark.top,
            },
        ])

        operations.push(`watermark ${watermark.width}x${watermark.height} at ${watermark.left},${watermark.top}`)
    }

    console.log(`[image] ${formatPath(source)}: ${operations.join(", ")}`)
}

export { createWatermark, isPrimaryPhoto, sourcePath, watermarkOptions }
export default transformImage
