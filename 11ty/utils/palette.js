import { getPalette } from "colorthief"

export default async (file) => {
    const palette = await getPalette(file, {
        colorCount: 6,
        colorSpace: "oklch",
    })

    return palette.map((color) => color.hex())
}
