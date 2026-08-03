#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const defaults = {
    effort: 5,
    keepMetadata: true,
    maxWidth: 2500,
    overwrite: true,
    quality: 82,
    watermark: path.join(projectRoot, "src/icons/above-logo.svg"),
    watermarkColor: "#ffffff",
    watermarkFill: true,
    watermarkFillColor: null,
    watermarkMargin: "0.75%",
    watermarkOpacity: 1,
    watermarkStrokeWidth: 2,
    watermarkWidth: "5%",
}

const usage = `Usage:
  npm run image:process -- <image> [more images] [options]

Examples:
  npm run image:process -- src/photos/example/photo.jpg
  npm run image:process -- src/photos/example/photo.jpg --quality 88 --watermark-opacity 0.45
  npm run image:process -- src/photos/example/photo.webp --watermark-width 420 --watermark-margin 80

Options:
  -o, --output <file>                 Write to a specific output file. Only valid for one input.
      --max-width <px>                Resize only when the image is wider than this. Default: 2500
      --quality <1-100>               WebP quality. Default: 82
      --effort <0-6>                  WebP encoder effort. Default: 5
      --watermark <file>              SVG watermark source. Default: src/icons/above-logo.svg
      --watermark-width <px|percent>  Watermark width. Default: 5%
      --watermark-margin <px|percent> Bottom-right margin from the image edge. Default: 0.75%
      --watermark-opacity <0-1>       Watermark opacity. Default: 1
      --watermark-color <color>       SVG outline color. Default: #ffffff
      --watermark-stroke-width <n>    SVG outline stroke width. Default: 2
      --watermark-fill                Fill the SVG watermark.
      --no-watermark-fill             Render the SVG watermark as outline-only.
      --watermark-fill-color <color>  SVG fill color. Defaults to --watermark-color.
      --no-watermark                  Skip adding the watermark.
      --strip-metadata                Do not preserve image metadata.
      --no-overwrite                  Fail when the output file already exists.
      --dry-run                       Print what would happen without writing files.
      --help                          Show this help text.
`

class CliError extends Error {
    constructor(message) {
        super(message)
        this.name = "CliError"
    }
}

const readOptionValue = (args, index, option) => {
    const inlineValue = option.includes("=") ? option.slice(option.indexOf("=") + 1) : null

    if (inlineValue != null && inlineValue !== "") {
        return { value: inlineValue, index }
    }

    const value = args[index + 1]

    if (!value || value.startsWith("-")) {
        throw new CliError(`${option.split("=")[0]} requires a value`)
    }

    return { value, index: index + 1 }
}

const parseInteger = (value, option, { min, max } = {}) => {
    const parsed = Number(value)

    if (!Number.isInteger(parsed)) {
        throw new CliError(`${option} must be an integer`)
    }

    if (min != null && parsed < min) {
        throw new CliError(`${option} must be at least ${min}`)
    }

    if (max != null && parsed > max) {
        throw new CliError(`${option} must be at most ${max}`)
    }

    return parsed
}

const parseNumber = (value, option, { min, max } = {}) => {
    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
        throw new CliError(`${option} must be a number`)
    }

    if (min != null && parsed < min) {
        throw new CliError(`${option} must be at least ${min}`)
    }

    if (max != null && parsed > max) {
        throw new CliError(`${option} must be at most ${max}`)
    }

    return parsed
}

const parseArgs = (args, { allowOutput = true, requireInputs = true } = {}) => {
    const options = { ...defaults }
    const inputs = []

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index]
        const optionName = arg.split("=")[0]

        if (arg === "--help" || arg === "-h") {
            return { help: true }
        }

        if (arg === "--dry-run") {
            options.dryRun = true
            continue
        }

        if (arg === "--no-overwrite") {
            options.overwrite = false
            continue
        }

        if (arg === "--no-watermark") {
            options.watermark = null
            continue
        }

        if (arg === "--strip-metadata") {
            options.keepMetadata = false
            continue
        }

        if (arg === "--watermark-fill") {
            options.watermarkFill = true
            continue
        }

        if (arg === "--no-watermark-fill") {
            options.watermarkFill = false
            continue
        }

        if (arg === "-o" || optionName === "--output") {
            const result = readOptionValue(args, index, arg)
            options.output = result.value
            index = result.index
            continue
        }

        if (optionName === "--max-width") {
            const result = readOptionValue(args, index, arg)
            options.maxWidth = parseInteger(result.value, "--max-width", { min: 1 })
            index = result.index
            continue
        }

        if (optionName === "--quality") {
            const result = readOptionValue(args, index, arg)
            options.quality = parseInteger(result.value, "--quality", { min: 1, max: 100 })
            index = result.index
            continue
        }

        if (optionName === "--effort") {
            const result = readOptionValue(args, index, arg)
            options.effort = parseInteger(result.value, "--effort", { min: 0, max: 6 })
            index = result.index
            continue
        }

        if (optionName === "--watermark") {
            const result = readOptionValue(args, index, arg)
            options.watermark = result.value
            index = result.index
            continue
        }

        if (optionName === "--watermark-width") {
            const result = readOptionValue(args, index, arg)
            options.watermarkWidth = result.value
            index = result.index
            continue
        }

        if (optionName === "--watermark-margin") {
            const result = readOptionValue(args, index, arg)
            options.watermarkMargin = result.value
            index = result.index
            continue
        }

        if (optionName === "--watermark-opacity") {
            const result = readOptionValue(args, index, arg)
            options.watermarkOpacity = parseNumber(result.value, "--watermark-opacity", { min: 0, max: 1 })
            index = result.index
            continue
        }

        if (optionName === "--watermark-color") {
            const result = readOptionValue(args, index, arg)
            options.watermarkColor = result.value
            index = result.index
            continue
        }

        if (optionName === "--watermark-fill-color") {
            const result = readOptionValue(args, index, arg)
            options.watermarkFill = true
            options.watermarkFillColor = result.value
            index = result.index
            continue
        }

        if (optionName === "--watermark-stroke-width") {
            const result = readOptionValue(args, index, arg)
            options.watermarkStrokeWidth = parseNumber(result.value, "--watermark-stroke-width", { min: 0 })
            index = result.index
            continue
        }

        if (arg.startsWith("-")) {
            throw new CliError(`Unknown option: ${arg}`)
        }

        inputs.push(arg)
    }

    if (inputs.length === 0 && requireInputs) {
        throw new CliError("Provide at least one image path")
    }

    if (options.output && !allowOutput) {
        throw new CliError("--output cannot be used when processing multiple images")
    }

    if (inputs.length > 1 && options.output) {
        throw new CliError("--output can only be used with one input image")
    }

    return { inputs, options }
}

const pathExists = async (file) => {
    try {
        await fs.access(file)
        return true
    } catch {
        return false
    }
}

const escapeXmlAttribute = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

const parseViewBox = (svg) => {
    const match = svg.match(/\sviewBox=(["'])(?<viewBox>.*?)\1/i)

    if (!match?.groups?.viewBox) {
        throw new CliError("Watermark SVG must include a viewBox")
    }

    const values = match.groups.viewBox
        .trim()
        .split(/[\s,]+/)
        .map(Number)

    if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
        throw new CliError("Watermark SVG viewBox must contain four numeric values")
    }

    const [, , width, height] = values

    if (width <= 0 || height <= 0) {
        throw new CliError("Watermark SVG viewBox width and height must be positive")
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

const resolveLength = (value, base, option) => {
    const normalized = String(value).trim().toLowerCase()
    const isPercentage = normalized.endsWith("%")
    const isPixelValue = normalized.endsWith("px")
    const numericValue = isPercentage ? normalized.slice(0, -1) : isPixelValue ? normalized.slice(0, -2) : normalized
    const parsed = Number(numericValue)

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new CliError(`${option} must be a positive pixel or percentage value`)
    }

    return Math.max(1, Math.round(isPercentage ? (base * parsed) / 100 : parsed))
}

const orientedDimensions = ({ height, orientation, width }) => {
    const shouldSwapDimensions = orientation != null && orientation >= 5 && orientation <= 8

    return {
        height: shouldSwapDimensions ? width : height,
        width: shouldSwapDimensions ? height : width,
    }
}

const resolveOutputPath = (input, options) => {
    if (options.output) {
        return path.resolve(options.output)
    }

    const parsed = path.parse(input)

    return path.join(parsed.dir, `${parsed.name}.webp`)
}

const resolveWatermarkPath = (file) => {
    if (!file) {
        return null
    }

    return path.resolve(file)
}

const createWatermark = async ({ imageHeight, imageWidth, options }) => {
    const watermarkPath = resolveWatermarkPath(options.watermark)
    const source = await fs.readFile(watermarkPath, "utf8")
    const viewBox = parseViewBox(source)
    const margin = resolveLength(options.watermarkMargin, imageWidth, "--watermark-margin")
    const requestedWidth = resolveLength(options.watermarkWidth, imageWidth, "--watermark-width")
    const maxWidth = Math.max(1, imageWidth - margin * 2)
    const maxHeight = Math.max(1, imageHeight - margin * 2)
    const requestedHeight = Math.round((requestedWidth * viewBox.height) / viewBox.width)
    const scale = Math.min(1, maxWidth / requestedWidth, maxHeight / requestedHeight)
    const width = Math.max(1, Math.round(requestedWidth * scale))
    const height = Math.max(1, Math.round(requestedHeight * scale))
    const innerSvg = addNonScalingStroke(removePaintDeclarations(stripSvgWrapper(source)))
    const fillColor = options.watermarkFill ? escapeXmlAttribute(options.watermarkFillColor ?? options.watermarkColor) : "none"
    const strokeColor = options.watermarkStrokeWidth > 0 ? escapeXmlAttribute(options.watermarkColor) : "none"
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.value}" width="${width}" height="${height}">
<g fill="${fillColor}" stroke="${strokeColor}" stroke-width="${options.watermarkStrokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${options.watermarkOpacity}">
${innerSvg}
</g>
</svg>`

    return {
        buffer: Buffer.from(svg),
        fill: options.watermarkFill,
        height,
        left: Math.max(margin, imageWidth - width - margin),
        path: watermarkPath,
        top: Math.max(margin, imageHeight - height - margin),
        width,
    }
}

const formatPath = (file) => path.relative(process.cwd(), file) || "."

const processImage = async (input, options) => {
    const inputPath = path.resolve(input)
    const outputPath = resolveOutputPath(inputPath, options)

    if (!(await pathExists(inputPath))) {
        throw new CliError(`Input image does not exist: ${formatPath(inputPath)}`)
    }

    if (!options.overwrite && (await pathExists(outputPath))) {
        throw new CliError(`Output file already exists: ${formatPath(outputPath)}`)
    }

    const metadata = await sharp(inputPath, { failOn: "warning" }).metadata()
    const sourceDimensions = orientedDimensions(metadata)

    if (!sourceDimensions.width || !sourceDimensions.height) {
        throw new CliError(`Unable to read image dimensions: ${formatPath(inputPath)}`)
    }

    const outputWidth = Math.min(sourceDimensions.width, options.maxWidth)
    const outputHeight = Math.round(sourceDimensions.height * (outputWidth / sourceDimensions.width))
    const shouldResize = sourceDimensions.width > options.maxWidth
    const watermark = options.watermark
        ? await createWatermark({
              imageHeight: outputHeight,
              imageWidth: outputWidth,
              options,
          })
        : null

    if (options.dryRun) {
        return {
            inputPath,
            outputPath,
            outputHeight,
            outputWidth,
            shouldResize,
            watermark,
            written: false,
        }
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    let image = sharp(inputPath, { failOn: "warning" }).rotate()

    if (shouldResize) {
        image = image.resize({
            width: options.maxWidth,
            withoutEnlargement: true,
        })
    }

    if (watermark) {
        image = image.composite([
            {
                input: watermark.buffer,
                left: watermark.left,
                top: watermark.top,
            },
        ])
    }

    image = image.webp({
        effort: options.effort,
        quality: options.quality,
        smartSubsample: true,
    })

    if (options.keepMetadata) {
        image = image.withMetadata()
    }

    const temporaryPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${Date.now()}.tmp.webp`)

    try {
        await image.toFile(temporaryPath)
        await fs.rename(temporaryPath, outputPath)
    } catch (error) {
        await fs.unlink(temporaryPath).catch(() => {})
        throw error
    }

    return {
        inputPath,
        outputPath,
        outputHeight,
        outputWidth,
        shouldResize,
        watermark,
        written: true,
    }
}

const printResult = (result) => {
    const action = result.written ? "Processed" : "Would process"
    const resize = result.shouldResize ? `resized to ${result.outputWidth}px wide` : `kept at ${result.outputWidth}px wide`
    const watermark = result.watermark ? `${result.watermark.fill ? "filled " : ""}watermark ${result.watermark.width}x${result.watermark.height}px at ${result.watermark.left},${result.watermark.top}` : "no watermark"

    console.log(`${action}: ${formatPath(result.inputPath)} -> ${formatPath(result.outputPath)} (${resize}, ${watermark})`)
}

const main = async () => {
    const parsed = parseArgs(process.argv.slice(2))

    if (parsed.help) {
        console.log(usage)
        return
    }

    for (const input of parsed.inputs) {
        printResult(await processImage(input, parsed.options))
    }
}

const handleCliError = (error) => {
    if (error instanceof CliError) {
        console.error(error.message)
        console.error("Run `npm run image:process -- --help` for usage.")
        process.exitCode = 1
        return
    }

    throw error
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(handleCliError)
}

export { CliError, defaults, handleCliError, parseArgs, printResult, processImage }
