import profile from "./profile.js"

export default {
    title: "My Photos",
    description: "My favourite photos.",
    keywords: ["photography", "photos", "11ty"],
    url: process.env.URL ?? "https://www.example.com",
    author: profile.name,
}
