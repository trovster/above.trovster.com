#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const defaultPhotosRoot = path.join(projectRoot, "src/content/photos")

const usage = `Usage:
  npm run create -- <title>

Examples:
  npm run create -- Aylesby
  npm run create -- "Cleethorpes Country Park"
`

class CliError extends Error {
    constructor(message) {
        super(message)
        this.name = "CliError"
    }
}

const normalizeTitle = (parts) => parts.join(" ").replace(/\s+/g, " ").trim()

const slugify = (title) =>
    title
        .normalize("NFKD")
        .replace(/\p{Mark}/gu, "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
        .replace(/^-|-$/g, "")

const parseArgs = (args) => {
    if (args.includes("--help") || args.includes("-h")) {
        return { help: true }
    }

    const unknownOption = args.find((arg) => arg.startsWith("-"))

    if (unknownOption) {
        throw new CliError(`Unknown option: ${unknownOption}`)
    }

    const title = normalizeTitle(args)

    if (!title) {
        throw new CliError("Provide a photo title")
    }

    return { title }
}

const wikipediaUrlFor = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`

const markdownFor = (title) => `---
enabled: 0
title: ${JSON.stringify(title)}
src: image.jpg
alt: ${JSON.stringify(`Aerial photograph of the church in ${title}, Lincolnshire.`)}
panorama:
  enabled: 0
  src: panorama.jpg
  alt: ${JSON.stringify(`360 aerial photograph of ${title}, Lincolnshire.`)}
images:
  - src: 1.jpg
    enabled: 0
  - src: 2.jpg
    enabled: 0
  - src: 3.jpg
    enabled: 0
  - src: 4.jpg
    enabled: 0
  - src: 5.jpg
    enabled: 0
category: Church
meta:
  Name: ""
  Type: Church
  Built: ""
location:
  name: ${JSON.stringify(title)}
  region: Lincolnshire, England
wikipedia:
  title: ${JSON.stringify(title)}
  url: ${JSON.stringify(wikipediaUrlFor(title))}
---
`

const createPhoto = async (title, { photosRoot = defaultPhotosRoot } = {}) => {
    const slug = slugify(title)

    if (!slug) {
        throw new CliError("The title must contain at least one letter or number")
    }

    const directory = path.join(photosRoot, slug)

    try {
        await fs.mkdir(directory)
    } catch (error) {
        if (error.code === "EEXIST") {
            throw new CliError(`Photo folder already exists: ${path.relative(process.cwd(), directory)}`)
        }

        throw error
    }

    const markdownPath = path.join(directory, "index.md")

    try {
        await fs.writeFile(markdownPath, markdownFor(title), { flag: "wx" })
    } catch (error) {
        await fs.rmdir(directory).catch(() => {})
        throw error
    }

    return { directory, markdownPath, slug }
}

const main = async () => {
    const parsed = parseArgs(process.argv.slice(2))

    if (parsed.help) {
        console.log(usage)
        return
    }

    const result = await createPhoto(parsed.title)
    console.log(`Created ${path.relative(process.cwd(), result.markdownPath)}`)
}

const handleCliError = (error) => {
    if (error instanceof CliError) {
        console.error(error.message)
        console.error("Run `npm run create -- --help` for usage.")
        process.exitCode = 1
        return
    }

    throw error
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(handleCliError)
}

export { CliError, createPhoto, markdownFor, normalizeTitle, parseArgs, slugify, wikipediaUrlFor }
