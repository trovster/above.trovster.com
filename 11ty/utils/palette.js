import { getPalette } from "colorthief"

export default async (file) => {
    const palette = await getPalette(file, {
        colorCount: 6,
        quality: 1,
        colorSpace: "oklch",
    })

    return palette.map((color) => color.hex())
}
