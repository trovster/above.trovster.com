#!/usr/bin/env node

import { execFile } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

import exifr from "exifr"

const execFileAsync = promisify(execFile)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const photoRoots = [path.join(projectRoot, "src/content/photos")]
const photoRootPaths = photoRoots.map((root) => path.relative(projectRoot, root))
const metadataExtensions = new Set([".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".heic", ".heif", ".png"])
const originalImageExtensions = new Set([".jpg", ".jpeg", ".tif", ".tiff", ".heic", ".heif", ".png"])

const usage = `Usage:
  npm run image:metadata -- [photo-dir|image ...] [options]

Examples:
  npm run image:metadata --
  npm run image:metadata -- --dry-run
  npm run image:metadata -- --all
  npm run image:metadata -- src/content/photos/beelsby

By default, git status is used to find new images in src/content/photos and
update the matching index.md front matter with EXIF date, latitude, and
longitude.

Options:
  --all       Process every photo directory with an image and index.md.
  --dry-run   Print changes without writing markdown files.
  --help      Show this help text.
`

class CliError extends Error {
    constructor(message) {
        super(message)
        this.name = "CliError"
    }
}

const isMetadataImage = (file) => metadataExtensions.has(path.extname(file).toLowerCase())
const isOriginalImage = (file) => originalImageExtensions.has(path.extname(file).toLowerCase())
const formatPath = (file) => path.relative(process.cwd(), file) || "."

const pathExists = async (file) => {
    try {
        await fs.access(file)
        return true
    } catch {
        return false
    }
}

const parseArgs = (args) => {
    const options = {
        all: false,
        dryRun: false,
        help: false,
    }
    const inputs = []

    for (const arg of args) {
        if (arg === "--help" || arg === "-h") {
            options.help = true
            continue
        }

        if (arg === "--all") {
            options.all = true
            continue
        }

        if (arg === "--dry-run") {
            options.dryRun = true
            continue
        }

        if (arg.startsWith("-")) {
            throw new CliError(`Unknown option: ${arg}`)
        }

        inputs.push(path.resolve(arg))
    }

    if (options.all && inputs.length) {
        throw new CliError("--all cannot be combined with explicit photo paths")
    }

    return { inputs, options }
}

const gitStatus = async () => {
    try {
        const { stdout } = await execFileAsync("git", ["status", "--porcelain=v1", "-z", "-uall", "--", ...photoRootPaths], {
            cwd: projectRoot,
        })

        return stdout.split("\0").filter(Boolean)
    } catch (error) {
        throw new CliError(`Unable to read git status: ${error.message}`)
    }
}

const parseGitStatusPath = (line) => {
    const status = line.slice(0, 2)
    const file = line.slice(3)

    if (status === "??") {
        return { file, isNew: true }
    }

    if (status.includes("D")) {
        return { file, isNew: false }
    }

    if (status.includes("A")) {
        return { file: file.includes(" -> ") ? file.split(" -> ").at(-1) : file, isNew: true }
    }

    return { file, isNew: false }
}

const photoDirectoryFor = (file) => {
    const absoluteFile = path.resolve(file)

    for (const root of photoRoots) {
        const relative = path.relative(root, absoluteFile)

        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            continue
        }

        const [photoDirectory] = relative.split(path.sep)

        if (!photoDirectory || photoDirectory === relative) {
            return null
        }

        return path.join(root, photoDirectory)
    }

    return null
}

const collectNewImageFilesFromGit = async () => {
    const files = []

    for (const line of await gitStatus()) {
        const { file, isNew } = parseGitStatusPath(line)
        const absoluteFile = path.join(projectRoot, file)

        if (isNew && isMetadataImage(absoluteFile)) {
            files.push(absoluteFile)
        }
    }

    return files
}

const collectImageFiles = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
        const file = path.join(directory, entry.name)

        if (entry.isDirectory()) {
            files.push(...(await collectImageFiles(file)))
            continue
        }

        if (entry.isFile() && isMetadataImage(file)) {
            files.push(file)
        }
    }

    return files
}

const collectPhotoDirectories = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    const directories = []

    if (await pathExists(path.join(directory, "index.md"))) {
        return [directory]
    }

    for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
        if (entry.isDirectory()) {
            directories.push(...(await collectPhotoDirectories(path.join(directory, entry.name))))
        }
    }

    return directories
}

const imageRank = (file) => {
    const basename = path.basename(file).toLowerCase()
    const extension = path.extname(file).toLowerCase()

    if (basename === "image.jpg") {
        return 0
    }

    if (basename === "image.jpeg") {
        return 1
    }

    if (isOriginalImage(file)) {
        return 2
    }

    if (extension === ".webp") {
        return 3
    }

    return 4
}

const chooseMetadataImage = (files) =>
    [...files].sort((first, second) => {
        const rank = imageRank(first) - imageRank(second)

        return rank === 0 ? first.localeCompare(second) : rank
    })[0]

const isPanoramaImage = (file) => path.basename(file, path.extname(file)).toLowerCase() === "panorama"

const targetsForDirectory = async (directory) => {
    const images = await collectImageFiles(directory)
    const standard = chooseMetadataImage(images.filter((image) => !isPanoramaImage(image)))

    return standard ? [{ directory, image: standard }] : []
}

const uniqueTargets = (targets) => [...new Map(targets.map((target) => [target.image, target])).values()]

const targetsForDirectories = async (directories) => uniqueTargets((await Promise.all(directories.map(targetsForDirectory))).flat())

const discoverPhotoTargets = async ({ inputs, options }) => {
    if (options.all) {
        const directories = (await Promise.all(photoRoots.map(collectPhotoDirectories))).flat()

        return targetsForDirectories(directories)
    }

    if (inputs.length) {
        const targets = []

        for (const input of inputs) {
            if (!(await pathExists(input))) {
                throw new CliError(`Path does not exist: ${formatPath(input)}`)
            }

            const stat = await fs.stat(input)

            if (stat.isDirectory()) {
                targets.push(...(await targetsForDirectories(await collectPhotoDirectories(input))))
                continue
            }

            if (!stat.isFile() || !isMetadataImage(input)) {
                throw new CliError(`Path is not a supported image or photo directory: ${formatPath(input)}`)
            }

            const directory = photoDirectoryFor(input)

            if (!directory) {
                throw new CliError(`Image is not inside a src/content/photos/<name> directory: ${formatPath(input)}`)
            }

            targets.push({ directory, image: input })
        }

        return uniqueTargets(targets)
    }

    return uniqueTargets((await collectNewImageFilesFromGit()).map((image) => ({ directory: photoDirectoryFor(image), image })).filter((target) => target.directory))
}

const parseMetadata = async (image) => {
    const metadata = await exifr.parse(image, {
        exif: true,
        gps: true,
        ifd0: true,
        tiff: true,
        xmp: true,
    })

    return metadata ?? {}
}

const metadataDate = (metadata) => {
    const value = metadata.DateTimeOriginal ?? metadata.CreateDate ?? metadata.DateTimeDigitized ?? metadata.ModifyDate

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value
    }

    if (typeof value === "string") {
        const date = new Date(value)

        if (!Number.isNaN(date.getTime())) {
            return date
        }
    }

    return null
}

const formatDate = (date) => date.toISOString().replace(/\.\d{3}Z$/, "+00:00")

const dmsToDecimal = (degrees, ref) => {
    if (!Array.isArray(degrees) || degrees.length < 3) {
        return null
    }

    const [wholeDegrees, minutes, seconds] = degrees.map(Number)

    if (![wholeDegrees, minutes, seconds].every(Number.isFinite)) {
        return null
    }

    const sign = ["S", "W"].includes(String(ref).toUpperCase()) ? -1 : 1

    return sign * (wholeDegrees + minutes / 60 + seconds / 3600)
}

const coordinate = (value) => {
    if (!Number.isFinite(value)) {
        return null
    }

    const rounded = Math.round(value * 1_000_000) / 1_000_000

    return Object.is(rounded, -0) ? "0" : Number(rounded.toFixed(6)).toString()
}

const metadataCoordinates = (metadata) => {
    const latitude = metadata.latitude ?? dmsToDecimal(metadata.GPSLatitude, metadata.GPSLatitudeRef)
    const longitude = metadata.longitude ?? dmsToDecimal(metadata.GPSLongitude, metadata.GPSLongitudeRef)

    return {
        latitude: coordinate(latitude),
        longitude: coordinate(longitude),
    }
}

const parseMarkdown = (markdown, file) => {
    const match = markdown.match(/^---\n(?<frontMatter>[\s\S]*?)\n---(?<body>\n[\s\S]*|$)/)

    if (!match?.groups) {
        throw new CliError(`Markdown file does not start with front matter: ${formatPath(file)}`)
    }

    return {
        body: match.groups.body,
        frontMatter: match.groups.frontMatter,
    }
}

const setTopLevelValue = (lines, key, value) => {
    const pattern = new RegExp(`^${key}:`)
    const index = lines.findIndex((line) => pattern.test(line))
    const replacement = `${key}: ${value}`

    if (index === -1) {
        lines.unshift(replacement)
        return
    }

    lines[index] = replacement
}

const sectionBounds = (lines, section) => {
    const start = lines.findIndex((line) => line === `${section}:`)

    if (start === -1) {
        return null
    }

    let end = lines.length

    for (let index = start + 1; index < lines.length; index += 1) {
        if (lines[index] && !lines[index].startsWith(" ")) {
            end = index
            break
        }
    }

    return { end, start }
}

const setNestedValue = (lines, section, key, value) => {
    let bounds = sectionBounds(lines, section)

    if (!bounds) {
        lines.push(`${section}:`)
        bounds = { start: lines.length - 1, end: lines.length }
    }

    const pattern = new RegExp(`^  ${key}:`)
    const index = lines.slice(bounds.start + 1, bounds.end).findIndex((line) => pattern.test(line))
    const replacement = `  ${key}: ${value}`

    if (index === -1) {
        lines.splice(bounds.end, 0, replacement)
        return
    }

    lines[bounds.start + 1 + index] = replacement
}

const updateFrontMatter = (frontMatter, fields) => {
    const lines = frontMatter.split("\n")

    if (fields.date) {
        setTopLevelValue(lines, "date", `"${fields.date}"`)
    }

    if (fields.latitude) {
        setNestedValue(lines, "location", "latitude", fields.latitude)
    }

    if (fields.longitude) {
        setNestedValue(lines, "location", "longitude", fields.longitude)
    }

    return lines.join("\n")
}

const updatePhotoMarkdown = async ({ directory, image }, options) => {
    const markdownPath = path.join(directory, "index.md")

    if (isPanoramaImage(image)) {
        return {
            directory,
            image,
            skipped: true,
            reason: "panorama metadata is inherited from the main photo",
        }
    }

    if (!(await pathExists(markdownPath))) {
        return {
            directory,
            image,
            skipped: true,
            reason: "index.md not found",
        }
    }

    const metadata = await parseMetadata(image)
    const date = metadataDate(metadata)
    const { latitude, longitude } = metadataCoordinates(metadata)
    const fields = {
        date: date ? formatDate(date) : null,
        latitude,
        longitude,
    }
    const missing = Object.entries(fields)
        .filter(([, value]) => !value)
        .map(([key]) => key)

    if (!fields.date && !fields.latitude && !fields.longitude) {
        return {
            directory,
            image,
            missing,
            skipped: true,
            reason: "no date or GPS metadata found",
        }
    }

    const markdown = await fs.readFile(markdownPath, "utf8")
    const { body, frontMatter } = parseMarkdown(markdown, markdownPath)
    const nextFrontMatter = updateFrontMatter(frontMatter, fields)
    const nextMarkdown = `---\n${nextFrontMatter}\n---${body}`

    if (nextMarkdown === markdown) {
        return {
            directory,
            fields,
            image,
            missing,
            unchanged: true,
        }
    }

    if (!options.dryRun) {
        await fs.writeFile(markdownPath, nextMarkdown)
    }

    return {
        directory,
        fields,
        image,
        missing,
        updated: true,
        written: !options.dryRun,
    }
}

const printResult = (result, options) => {
    const directory = formatPath(result.directory)
    const image = result.image ? ` from ${formatPath(result.image)}` : ""

    if (result.skipped) {
        console.log(`Skipped ${directory}${image}: ${result.reason}`)
        return
    }

    const action = result.unchanged ? "Already current" : options.dryRun ? "Would update" : "Updated"
    const fields = Object.entries(result.fields)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
    const missing = result.missing.length ? `; missing ${result.missing.join(", ")}` : ""

    console.log(`${action} ${path.join(directory, "index.md")}${image}: ${fields}${missing}`)
}

const main = async () => {
    const { inputs, options } = parseArgs(process.argv.slice(2))

    if (options.help) {
        console.log(usage)
        return
    }

    const targets = await discoverPhotoTargets({ inputs, options })

    if (targets.length === 0) {
        console.log("No new photo images found in git status.")
        return
    }

    for (const target of targets.sort((first, second) => first.image.localeCompare(second.image))) {
        printResult(await updatePhotoMarkdown(target, options), options)
    }
}

main().catch((error) => {
    if (error instanceof CliError) {
        console.error(error.message)
        console.error("Run `npm run image:metadata -- --help` for usage.")
        process.exitCode = 1
        return
    }

    throw error
})
