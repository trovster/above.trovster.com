import { readFileSync } from "node:fs"

import profile from "./profile.js"

const logo = readFileSync(new URL("../icons/above-logo.svg", import.meta.url), "utf8")

export default {
    title: "Above",
    logo,
    description: "Aerial landscape photography, from around Lincolnshire, captured by Trevor Morris.",
    keywords: ["landscape photography", "aerial photography", "drone photography", "drone", "photos", "Lincolnshire", "11ty"],
    url: process.env.URL ?? "https://www.example.com",
    author: profile.name,
}
