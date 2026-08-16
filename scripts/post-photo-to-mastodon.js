#!/usr/bin/env node

import "dotenv/config"

import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import matter from "gray-matter"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const photosRoot = path.join(projectRoot, "src/content/photos")
const defaultVisibility = "public"
const visibilityValues = new Set(["public", "unlisted", "private", "direct"])

const usage = `Usage:
  npm run mastodon:post -- <photo-slug|photo-dir> [options]

Examples:
  npm run mastodon:post -- beelsby --dry-run
  npm run mastodon:post -- src/content/photos/beelsby --visibility unlisted
  npm run mastodon:post -- riby --status "Riby from above"

Required .env values:
  MASTODON_INSTANCE_URL=https://mastodon.social
  MASTODON_ACCESS_TOKEN=...

The access token needs Mastodon write:media and write:statuses scopes.

Options:
  --status <text>                  Override the generated status text.
  --visibility <value>             public, unlisted, private, or direct. Default: public.
  --language <code>                Set the status language, for example en.
  --sensitive                      Mark attached media as sensitive.
  --media-poll-attempts <number>   Number of async media processing checks. Default: 30.
  --media-poll-interval-ms <ms>    Delay between async media processing checks. Default: 2000.
  --dry-run                        Print the payload without uploading or posting.
  --help                           Show this help text.
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

const parseInteger = (value, option, { min } = {}) => {
    const parsed = Number(value)

    if (!Number.isInteger(parsed)) {
        throw new CliError(`${option} must be an integer`)
    }

    if (min != null && parsed < min) {
        throw new CliError(`${option} must be at least ${min}`)
    }

    return parsed
}

const parseArgs = (args) => {
    const options = {
        dryRun: false,
        language: process.env.MASTODON_STATUS_LANGUAGE ?? "",
        mediaPollAttempts: 30,
        mediaPollIntervalMs: 2000,
        sensitive: false,
        spoilerText: "",
        status: "",
        visibility: process.env.MASTODON_STATUS_VISIBILITY ?? defaultVisibility,
    }
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

        if (arg === "--sensitive") {
            options.sensitive = true
            continue
        }

        if (optionName === "--status") {
            const result = readOptionValue(args, index, arg)
            options.status = result.value
            index = result.index
            continue
        }

        if (optionName === "--visibility") {
            const result = readOptionValue(args, index, arg)
            options.visibility = result.value
            index = result.index
            continue
        }

        if (optionName === "--language") {
            const result = readOptionValue(args, index, arg)
            options.language = result.value
            index = result.index
            continue
        }

        if (optionName === "--media-poll-attempts") {
            const result = readOptionValue(args, index, arg)
            options.mediaPollAttempts = parseInteger(result.value, "--media-poll-attempts", { min: 1 })
            index = result.index
            continue
        }

        if (optionName === "--media-poll-interval-ms") {
            const result = readOptionValue(args, index, arg)
            options.mediaPollIntervalMs = parseInteger(result.value, "--media-poll-interval-ms", { min: 0 })
            index = result.index
            continue
        }

        if (arg.startsWith("-")) {
            throw new CliError(`Unknown option: ${arg}`)
        }

        inputs.push(arg)
    }

    if (inputs.length !== 1) {
        throw new CliError("Provide exactly one photo slug or src/content/photos/<slug> directory")
    }

    if (!visibilityValues.has(options.visibility)) {
        throw new CliError(`--visibility must be one of: ${[...visibilityValues].join(", ")}`)
    }

    return {
        input: inputs[0],
        options,
    }
}

const pathExists = async (file) => {
    try {
        await fs.access(file)
        return true
    } catch {
        return false
    }
}

const isInside = (file, directory) => {
    const relative = path.relative(directory, file)

    return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
}

const formatPath = (file) => path.relative(process.cwd(), file) || "."

const normalizeBaseUrl = (value) => {
    const url = new URL(value)
    url.pathname = url.pathname.replace(/\/+$/, "")
    url.search = ""
    url.hash = ""

    return url
}

const apiUrl = (baseUrl, pathname) => new URL(pathname, `${baseUrl.origin}${baseUrl.pathname}/`)

const readPackage = async () => JSON.parse(await fs.readFile(path.join(projectRoot, "package.json"), "utf8"))

const resolvePhotoDirectory = async (input) => {
    const candidate = input.includes("/") || input.includes(path.sep) ? path.resolve(input) : path.join(photosRoot, input)
    const directory = path.resolve(candidate)

    if (!isInside(directory, photosRoot)) {
        throw new CliError(`Photo must be inside src/content/photos: ${formatPath(directory)}`)
    }

    if (!(await pathExists(path.join(directory, "index.md")))) {
        throw new CliError(`Photo index.md not found: ${formatPath(path.join(directory, "index.md"))}`)
    }

    return directory
}

const readPhoto = async (input) => {
    const directory = await resolvePhotoDirectory(input)
    const slug = path.basename(directory)
    const source = await fs.readFile(path.join(directory, "index.md"), "utf8")
    const { data, content } = matter(source)

    if (Number(data.enabled) !== 1) {
        throw new CliError(`Photo is not enabled: ${slug}`)
    }

    if (!data.src) {
        throw new CliError(`Photo src is missing: ${formatPath(path.join(directory, "index.md"))}`)
    }

    const image = path.resolve(directory, data.src)

    if (!isInside(image, directory) || !(await pathExists(image))) {
        throw new CliError(`Photo image not found: ${formatPath(image)}`)
    }

    return {
        content: content.trim(),
        data,
        directory,
        image,
        slug,
    }
}

const mimeType = (file) => {
    switch (path.extname(file).toLowerCase()) {
        case ".gif":
            return "image/gif"
        case ".jpg":
        case ".jpeg":
            return "image/jpeg"
        case ".png":
            return "image/png"
        case ".webp":
            return "image/webp"
        default:
            throw new CliError(`Unsupported image type: ${formatPath(file)}`)
    }
}

const titleText = (photo) => String('📸 New #drone #photo: ' + photo.data.title ?? photo.slug)

const locationText = (photo) => {
    const parts = [photo.data.location?.name, photo.data.location?.region].filter(Boolean)

    return parts.join(", ")
}

const buildPhotoUrl = (siteUrl, photo) => {
    if (!siteUrl) {
        return ""
    }

    return new URL(`/${photo.slug}/`, siteUrl).toString()
}

const applyStatusTemplate = (template, values) =>
    template.replace(/\{(title|alt|url|location|category)\}/g, (match, key) => values[key] ?? "")

const buildStatus = (photo, siteUrl, override = "") => {
    if (override) {
        return override
    }

    const values = {
        alt: String(photo.data.alt ?? ""),
        category: String(photo.data.category ?? ""),
        location: locationText(photo),
        title: titleText(photo),
        url: buildPhotoUrl(siteUrl, photo),
    }

    if (process.env.MASTODON_STATUS_TEMPLATE) {
        return applyStatusTemplate(process.env.MASTODON_STATUS_TEMPLATE, values).trim()
    }

    return [values.title, values.alt, values.url].filter(Boolean).join("\n\n")
}

const readRequiredEnv = (name) => {
    const value = process.env[name]?.trim()

    if (!value) {
        throw new CliError(`Missing ${name} in .env`)
    }

    return value
}

const readPostingConfig = () => ({
    accessToken: readRequiredEnv("MASTODON_ACCESS_TOKEN"),
    instanceUrl: normalizeBaseUrl(readRequiredEnv("MASTODON_INSTANCE_URL")),
})

const readTextResponse = async (response) => {
    const text = await response.text()

    if (!text) {
        return {}
    }

    try {
        return JSON.parse(text)
    } catch {
        return { error: text }
    }
}

const assertOk = async (response, action) => {
    if (response.ok) {
        return readTextResponse(response)
    }

    const payload = await readTextResponse(response)
    const message = payload.error ?? payload.error_description ?? response.statusText

    throw new CliError(`${action} failed (${response.status}): ${message}`)
}

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const waitForMedia = async (media, config, options) => {
    for (let attempt = 1; attempt <= options.mediaPollAttempts; attempt += 1) {
        if (attempt > 1 || options.mediaPollIntervalMs > 0) {
            await wait(options.mediaPollIntervalMs)
        }

        const response = await fetch(apiUrl(config.instanceUrl, `/api/v1/media/${media.id}`), {
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
            },
        })

        if (response.status === 206) {
            continue
        }

        const payload = await assertOk(response, "Checking media")

        if (payload.url) {
            return payload
        }
    }

    throw new CliError(`Media ${media.id} was not ready after ${options.mediaPollAttempts} checks`)
}

const uploadMedia = async (photo, config, options) => {
    const form = new FormData()
    const file = new Blob([await fs.readFile(photo.image)], { type: mimeType(photo.image) })

    form.append("file", file, path.basename(photo.image))
    form.append("description", String(photo.data.alt ?? titleText(photo)))

    const response = await fetch(apiUrl(config.instanceUrl, "/api/v2/media"), {
        body: form,
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
        method: "POST",
    })
    const media = await assertOk(response, "Uploading media")

    if (!media.id) {
        throw new CliError("Mastodon did not return a media id")
    }

    if (response.status === 202 || !media.url) {
        return waitForMedia(media, config, options)
    }

    return media
}

const postStatus = async (media, status, config, options) => {
    const form = new FormData()

    form.append("status", status)
    form.append("media_ids[]", media.id)
    form.append("visibility", options.visibility)

    if (options.sensitive) {
        form.append("sensitive", "true")
    }

    if (options.spoilerText) {
        form.append("spoiler_text", options.spoilerText)
    }

    if (options.language) {
        form.append("language", options.language)
    }

    const response = await fetch(apiUrl(config.instanceUrl, "/api/v1/statuses"), {
        body: form,
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Idempotency-Key": crypto.randomUUID(),
        },
        method: "POST",
    })

    return assertOk(response, "Posting status")
}

const main = async () => {
    const parsed = parseArgs(process.argv.slice(2))

    if (parsed.help) {
        console.log(usage)
        return
    }

    const photo = await readPhoto(parsed.input)
    const siteUrl = normalizeBaseUrl(process.env.SITE_URL ?? process.env.URL ?? (await readPackage()).homepage)
    const status = buildStatus(photo, siteUrl, parsed.options.status)

    if (parsed.options.dryRun) {
        console.log(
            JSON.stringify(
                {
                    image: formatPath(photo.image),
                    mediaDescription: photo.data.alt ?? titleText(photo),
                    photo: photo.slug,
                    status,
                    visibility: parsed.options.visibility,
                },
                null,
                2,
            ),
        )
        return
    }

    const config = readPostingConfig()
    const media = await uploadMedia(photo, config, parsed.options)
    const posted = await postStatus(media, status, config, parsed.options)

    console.log(`Posted ${titleText(photo)} to Mastodon: ${posted.url ?? posted.uri ?? posted.id}`)
}

const handleCliError = (error) => {
    if (error instanceof CliError) {
        console.error(error.message)
        console.error("Run `npm run mastodon:post -- --help` for usage.")
        process.exitCode = 1
        return
    }

    throw error
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(handleCliError)
}

export { buildStatus, parseArgs, readPhoto }
