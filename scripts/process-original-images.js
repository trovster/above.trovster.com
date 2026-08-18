#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

import { CliError, imageWidths } from "./process-image.js"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const photosDirectory = path.join(projectRoot, "src/content/photos")
const defaultPhotosDirectories = [photosDirectory]
const jpegExtensions = new Set([".jpg", ".jpeg"])
const jpegOptions = Object.freeze({
    chromaSubsampling: "4:4:4",
    quality: 100,
})
const metadataFields = Object.freeze(["exif", "icc", "iptc", "xmp"])

const usage = `Usage:
  npm run image:process:originals -- [photos-dir ...] [options]

Examples:
  npm run image:process:originals -- --dry-run
  npm run image:process:originals --
  npm run image:process:originals -- src/content/photos/wold-newton

Resizes committed original JPG/JPEG files in place when they exceed these
limits:
  image.jpg                 ${imageWidths.primary}px wide
  panorama.jpg              ${imageWidths.panorama}px wide
  1.jpg, 2.jpg, ...         ${imageWidths.gallery}px wide

Images are encoded as JPEG at quality 100 with 4:4:4 chroma subsampling. All
supported EXIF, ICC, XMP, and IPTC metadata is preserved. Files at or below
their limit are not rewritten.

Options:
  --dry-run                 Report changes without writing files.
  --help                    Show this help text.
`

const formatPath = (file) => path.relative(process.cwd(), file) || "."

const originalImageType = (file) => {
    if (!jpegExtensions.has(path.extname(file).toLowerCase())) {
        return null
    }

    const basename = path.basename(file, path.extname(file)).toLowerCase()

    if (basename === "image") {
        return {
            maxWidth: imageWidths.primary,
            type: "primary",
        }
    }

    if (basename === "panorama") {
        return {
            maxWidth: imageWidths.panorama,
            type: "panorama",
        }
    }

    if (/^\d+$/.test(basename)) {
        return {
            maxWidth: imageWidths.gallery,
            type: "gallery",
        }
    }

    return null
}

const collectOriginalImages = async (directory) => {
    let entries

    try {
        entries = await fs.readdir(directory, { withFileTypes: true })
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new CliError(`Photos directory does not exist: ${formatPath(directory)}`)
        }

        throw error
    }

    const files = []

    for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
        const file = path.join(directory, entry.name)

        if (entry.isDirectory()) {
            files.push(...(await collectOriginalImages(file)))
            continue
        }

        if (entry.isFile() && originalImageType(file)) {
            files.push(file)
        }
    }

    return files
}

const metadataPresent = (value) => value != null && value.length > 0

const verifyMetadata = async (file, sourceMetadata) => {
    const outputMetadata = await sharp(file, { failOn: "warning" }).metadata()
    const missingMetadata = metadataFields.filter(
        (field) => metadataPresent(sourceMetadata[field]) && !metadataPresent(outputMetadata[field]),
    )

    if (missingMetadata.length > 0) {
        throw new CliError(`Resized image is missing source metadata (${missingMetadata.join(", ")}): ${formatPath(file)}`)
    }
}

const resizeOriginalImage = async (file, { dryRun = false } = {}) => {
    const inputPath = path.resolve(file)
    const definition = originalImageType(inputPath)

    if (!definition) {
        throw new CliError(`Unsupported original image filename: ${formatPath(inputPath)}`)
    }

    let metadata

    try {
        metadata = await sharp(inputPath, { failOn: "warning" }).metadata()
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new CliError(`Original image does not exist: ${formatPath(inputPath)}`)
        }

        throw error
    }

    if (!metadata.width || !metadata.height) {
        throw new CliError(`Unable to read image dimensions: ${formatPath(inputPath)}`)
    }

    const shouldResize = metadata.width > definition.maxWidth
    const outputWidth = shouldResize ? definition.maxWidth : metadata.width
    const outputHeight = Math.round(metadata.height * (outputWidth / metadata.width))
    const result = {
        inputHeight: metadata.height,
        inputPath,
        inputWidth: metadata.width,
        maxWidth: definition.maxWidth,
        outputHeight,
        outputWidth,
        shouldResize,
        type: definition.type,
        written: false,
    }

    if (!shouldResize || dryRun) {
        return result
    }

    const sourceStat = await fs.stat(inputPath)
    const temporaryPath = path.join(path.dirname(inputPath), `.${path.basename(inputPath)}.${process.pid}.${Date.now()}.tmp.jpg`)

    try {
        await sharp(inputPath, { failOn: "warning" })
            .resize({
                width: definition.maxWidth,
                withoutEnlargement: true,
            })
            .jpeg(jpegOptions)
            .keepMetadata()
            .toFile(temporaryPath)

        await verifyMetadata(temporaryPath, metadata)
        await fs.chmod(temporaryPath, sourceStat.mode & 0o7777)
        await fs.rename(temporaryPath, inputPath)
    } catch (error) {
        await fs.unlink(temporaryPath).catch(() => {})
        throw error
    }

    result.written = true

    return result
}

const printResult = (result, { dryRun = false } = {}) => {
    if (!result.shouldResize) {
        console.log(`Skipped: ${formatPath(result.inputPath)} (${result.inputWidth}px wide; limit ${result.maxWidth}px)`)
        return
    }

    const action = dryRun ? "Would resize" : "Resized"

    console.log(`${action}: ${formatPath(result.inputPath)} (${result.inputWidth}x${result.inputHeight} -> ${result.outputWidth}x${result.outputHeight}, quality ${jpegOptions.quality}, metadata kept)`)
}

const parseArgs = (args) => {
    const directories = []
    let dryRun = false

    for (const arg of args) {
        if (arg === "--help" || arg === "-h") {
            return { help: true }
        }

        if (arg === "--dry-run") {
            dryRun = true
            continue
        }

        if (arg.startsWith("-")) {
            throw new CliError(`Unknown option: ${arg}`)
        }

        directories.push(path.resolve(arg))
    }

    return {
        directories: directories.length ? directories : defaultPhotosDirectories,
        dryRun,
        help: false,
    }
}

const main = async () => {
    const options = parseArgs(process.argv.slice(2))

    if (options.help) {
        console.log(usage)
        return
    }

    const images = [...new Set((await Promise.all(options.directories.map(collectOriginalImages))).flat())]

    if (images.length === 0) {
        console.log(`No supported original JPG images found in ${options.directories.map(formatPath).join(", ")}`)
        return
    }

    const results = []

    for (const image of images) {
        const result = await resizeOriginalImage(image, options)
        results.push(result)
        printResult(result, options)
    }

    const resizeCount = results.filter((result) => result.shouldResize).length
    const action = options.dryRun ? "Would resize" : "Resized"

    console.log(`${action} ${resizeCount} of ${results.length} original image${results.length === 1 ? "" : "s"}.`)
}

const handleCliError = (error) => {
    if (error instanceof CliError) {
        console.error(error.message)
        console.error("Run `npm run image:process:originals -- --help` for usage.")
        process.exitCode = 1
        return
    }

    throw error
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(handleCliError)
}

export { collectOriginalImages, jpegOptions, metadataFields, originalImageType, parseArgs, resizeOriginalImage, verifyMetadata }
