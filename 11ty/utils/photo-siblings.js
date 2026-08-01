export default (photos, index) => ({
    previous: photos[index - 1] ?? null,
    next: photos[index + 1] ?? null,
})
