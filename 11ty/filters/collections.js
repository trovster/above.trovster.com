const collections = {
    /**
     * Limit items, based on a passed limit.
     *
     * @param {Array} arr - items to filter
     * @param {Integer} limit - count to limit
     * @returns {Array} filtered items
     */
    limit: (arr, limit = 1) => (arr ?? []).slice(0, limit),

    /**
     * Find the first item.
     *
     * @param {Array} arr - items to filter
     * @returns {Mixed} item
     */
    first: (arr) => collections.limit(arr, 1).pop(),
}

export default collections
