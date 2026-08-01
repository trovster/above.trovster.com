import { initBlurhashPlaceholders } from "./blurhash.js"

const selectors = {
    list: "[data-photo-list]",
    next: "[data-photo-list-next]",
    status: "[data-photo-list-status]",
}

const parsePhotoPage = (markup) => {
    const parser = new DOMParser()
    const document = parser.parseFromString(markup, "text/html")
    const list = document.querySelector(selectors.list)

    if (!list) {
        throw new Error("Could not find photo list in fetched page")
    }

    return {
        items: Array.from(list.children),
        nextHref: document.querySelector(selectors.next)?.href ?? null,
    }
}

const importListItems = (items) => {
    const fragment = document.createDocumentFragment()

    for (const item of items) {
        fragment.append(document.importNode(item, true))
    }

    return fragment
}

export const createInfiniteScroller = ({ list, nextLink, status, fetchPage, parsePage, replaceUrl, observerFactory, importItems, onItemsAppended }) => {
    if (!list || !nextLink) {
        return null
    }

    const readyText = nextLink.dataset.readyText ?? nextLink.textContent.trim() ?? "Next"
    const loadingText = nextLink.dataset.loadingText ?? "Loading…"
    const endText = list.dataset.endText ?? "End"

    let loading = false
    let observer = null

    const setStatus = (message = "") => {
        if (status) {
            status.textContent = message
        }
    }

    const setLoading = (active) => {
        loading = active
        nextLink.dataset.loading = active ? "true" : "false"
        nextLink.setAttribute("aria-busy", active ? "true" : "false")
        nextLink.textContent = active ? loadingText : readyText

        if (active) {
            setStatus(loadingText)
        }
    }

    const finish = () => {
        loading = false
        nextLink.dataset.loading = "false"
        nextLink.setAttribute("aria-busy", "false")
        nextLink.hidden = true
        nextLink.removeAttribute("href")
        nextLink.setAttribute("aria-hidden", "true")
        nextLink.setAttribute("tabindex", "-1")
        nextLink.textContent = readyText
        setStatus(endText)

        if (observer) {
            observer.disconnect()
        }
    }

    const loadNextPage = async () => {
        const url = nextLink.href

        if (loading || !url) {
            return
        }

        setLoading(true)

        try {
            const markup = await fetchPage(url)
            const { items, nextHref } = parsePage(markup)
            const importedItems = importItems(items)

            onItemsAppended?.(importedItems)
            list.append(importedItems)
            replaceUrl(url)

            if (nextHref) {
                nextLink.href = nextHref
                setStatus("")
            } else {
                finish()
            }
        } catch {
            setStatus("Unable to load more photos.")
        } finally {
            if (!nextLink.hidden) {
                setLoading(false)
            }
        }
    }

    nextLink.addEventListener("click", (event) => {
        event.preventDefault()
        void loadNextPage()
    })

    if (observerFactory) {
        observer = observerFactory((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    void loadNextPage()
                }
            }
        })

        observer?.observe(nextLink)
    }

    return {
        loadNextPage,
    }
}

export const initInfinitePhotoPagination = () => {
    const list = document.querySelector(selectors.list)
    const nextLink = document.querySelector(selectors.next)
    const status = document.querySelector(selectors.status)

    return createInfiniteScroller({
        list,
        nextLink,
        status,
        fetchPage: async (url) => {
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`Unexpected response: ${response.status}`)
            }

            return response.text()
        },
        parsePage: parsePhotoPage,
        replaceUrl: (url) => {
            window.history.replaceState({}, "", url)
        },
        observerFactory:
            "IntersectionObserver" in window
                ? (callback) =>
                      new IntersectionObserver(callback, {
                          rootMargin: "200px 0px",
                      })
                : null,
        importItems: importListItems,
        onItemsAppended: (fragment) => {
            initBlurhashPlaceholders(fragment)
        },
    })
}
