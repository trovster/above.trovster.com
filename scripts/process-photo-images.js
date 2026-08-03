#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import { CliError, parseArgs, printResult, processImage } from "./process-image.js"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const defaultPhotosDirectory = path.join(projectRoot, "src/photos")
const jpegExtensions = new Set([".jpg", ".jpeg"])

const usage = `Usage:
  npm run image:process:photos -- [photos-dir ...] [options]

Examples:
  npm run image:process:photos --
  npm run image:process:photos -- --dry-run
  npm run image:process:photos -- src/photos/wold-newton --quality 88 --watermark-fill

Scans each directory recursively for original JPG/JPEG images and processes each
one with the same options as npm run image:process. --output is not supported
for batch processing because each image writes its own .webp file beside the
source.
`

const isJpeg = (file) => jpegExtensions.has(path.extname(file).toLowerCase())

const collectJpegs = async (directory) => {
    let entries

    try {
        entries = await fs.readdir(directory, { withFileTypes: true })
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new CliError(`Photos directory does not exist: ${path.relative(process.cwd(), directory)}`)
        }

        throw error
    }

    const files = []

    for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
        const file = path.join(directory, entry.name)

        if (entry.isDirectory()) {
            files.push(...(await collectJpegs(file)))
            continue
        }

        if (entry.isFile() && isJpeg(file)) {
            files.push(file)
        }
    }

    return files
}

const unique = (files) => [...new Set(files)]

const main = async () => {
    const args = process.argv.slice(2)

    if (args.includes("--help") || args.includes("-h")) {
        console.log(usage)
        return
    }

    const { inputs: directories, options } = parseArgs(args, {
        allowOutput: false,
        requireInputs: false,
    })
    const roots = directories.length ? directories.map((directory) => path.resolve(directory)) : [defaultPhotosDirectory]
    const images = unique((await Promise.all(roots.map(collectJpegs))).flat())

    if (images.length === 0) {
        console.log(`No JPG images found in ${roots.map((root) => path.relative(process.cwd(), root)).join(", ")}`)
        return
    }

    console.log(`${options.dryRun ? "Would process" : "Processing"} ${images.length} JPG image${images.length === 1 ? "" : "s"}.`)

    for (const image of images) {
        printResult(await processImage(image, options))
    }
}

main().catch((error) => {
    if (error instanceof CliError) {
        console.error(error.message)
        console.error("Run `npm run image:process:photos -- --help` for usage.")
        process.exitCode = 1
        return
    }

    throw error
})
