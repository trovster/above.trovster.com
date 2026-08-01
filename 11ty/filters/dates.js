import { dateToRfc3339, dateToRfc822 } from "@11ty/eleventy-plugin-rss"
import { DateTime } from "luxon"

// @see https://github.com/moment/luxon/issues/118
// @uses 'S' from php.net/date
function ordinal(n) {
    var s = ["th", "st", "nd", "rd"]
    var v = n % 100
    return "'" + n + (s[(v - 20) % 10] || s[v] || s[0]) + "' "
}

const dates = {
    /**
     * Format a date with Luxon.
     * If you provide dS in the format, it assumes you want the ordinal suffix.
     *
     * @param {Date|String} date - JS Date or ISO string
     * @param {String} format - date format (Luxon)
     * @param {String} locale - locale
     * @returns {String} formatted date
     */
    date: (date, format, locale = "en") => {
        date = (date instanceof Date ? DateTime.fromJSDate(date) : DateTime.fromISO(date)).setLocale(locale)
        return date.toFormat(format.replace("dS ", ordinal(date.day)))
    },

    dateToRfc3339,

    dateToRfc822,
}

export default dates
