import { readFileSync } from "node:fs"

import exifr from "exifr"
import sharp from "sharp"

const pick = ["FocalLength", "FNumber", "ExposureTime", "ISO", "ApertureValue", "Make", "Model"]

const roundToDecimal = (value) => Math.round(value * 10) / 10
const readExifIcon = (filename) => readFileSync(new URL(`../../src/icons/exif/${filename}`, import.meta.url), "utf8")

const exifFields = [
    {
        key: "Camera",
        title: "Camera",
        icon: readExifIcon("camera.svg"),
        format: (exif) => (exif.Make && exif.Model ? `${exif.Make} ${exif.Model}` : null),
    },
    {
        key: "Focal_Length",
        title: "Focal Length",
        icon: readExifIcon("focal-length.svg"),
        format: (exif) => (exif.FocalLength ? `${roundToDecimal(exif.FocalLength)}mm` : null),
    },
    {
        key: "Aperture",
        title: "Aperture",
        icon: readExifIcon("aperture.svg"),
        format: (exif) => (exif.FNumber ? `ƒ/${roundToDecimal(exif.FNumber)}` : null),
    },
    {
        key: "Exposure",
        title: "Exposure",
        icon: readExifIcon("exposure.svg"),
        format: (exif) => (exif.ExposureTime ? `1/${roundToDecimal(1 / exif.ExposureTime)}s` : null),
    },
    {
        key: "ISO",
        title: "ISO",
        icon: readExifIcon("iso.svg"),
        format: (exif) => (exif.ISO == null ? null : `${exif.ISO}`),
    },
]

export const formatExifData = (exif) => {
    if (!exif) {
        return null
    }

    const items = exifFields
        .map(({ key, title, icon, format }) => {
            const value = format(exif)

            if (value == null || value === "") {
                return null
            }

            return { key, title, icon, value }
        })
        .filter(Boolean)

    return items.length ? items : null
}

const isUnsupportedFileFormat = (error) => error?.message === "Unknown file format"

const parseExif = async (file) => {
    try {
        return await exifr.parse(file, {
            pick,
        })
    } catch (error) {
        if (!isUnsupportedFileFormat(error)) {
            throw error
        }
    }

    const metadata = await sharp(file).metadata()

    if (!metadata.exif) {
        return null
    }

    try {
        return await exifr.parse(metadata.exif, {
            pick,
        })
    } catch (error) {
        if (!isUnsupportedFileFormat(error)) {
            throw error
        }

        return null
    }
}

export default async (file) => {
    return formatExifData(await parseExif(file))
}
