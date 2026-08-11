import { getPalette } from "colorthief"

export default async (file) => {
    const palette = await getPalette(file, {
        colorCount: 6,
        quality: 5,
        colorSpace: "oklch",
    })

    return palette.map((color) => ({
        hex: color.hex(),
        proportion: color.proportion,
    }))
}
