import { get } from "node:https"

const openMeteoEndpoint = "https://api.open-meteo.com/v1/forecast"
const timezone = "GMT"
const requestTimeoutMs = 20_000

// 15-minute variables requested from Open-Meteo. Only the point nearest the
// photo's capture time is kept (see nearestWeatherPoint), so this set defines
// the fields recorded for that point in weather.json.
const minutelyVariables = ["weather_code", "temperature_2m", "apparent_temperature", "relative_humidity_2m", "cloud_cover", "precipitation", "rain", "snowfall", "snow_depth", "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m", "visibility", "is_day"]

const dailyVariables = ["weather_code", "temperature_2m_max", "temperature_2m_min", "sunrise", "sunset", "precipitation_sum"]

// WMO weather interpretation codes → short human descriptions.
// https://open-meteo.com/en/docs#weathervariables
const weatherCodeDescriptions = new Map([
    [0, "Clear sky"],
    [1, "Mainly clear"],
    [2, "Partly cloudy"],
    [3, "Overcast"],
    [45, "Fog"],
    [48, "Depositing rime fog"],
    [51, "Light drizzle"],
    [53, "Moderate drizzle"],
    [55, "Dense drizzle"],
    [56, "Light freezing drizzle"],
    [57, "Dense freezing drizzle"],
    [61, "Slight rain"],
    [63, "Moderate rain"],
    [65, "Heavy rain"],
    [66, "Light freezing rain"],
    [67, "Heavy freezing rain"],
    [71, "Slight snowfall"],
    [73, "Moderate snowfall"],
    [75, "Heavy snowfall"],
    [77, "Snow grains"],
    [80, "Slight rain showers"],
    [81, "Moderate rain showers"],
    [82, "Violent rain showers"],
    [85, "Slight snow showers"],
    [86, "Heavy snow showers"],
    [95, "Thunderstorm"],
    [96, "Thunderstorm with slight hail"],
    [99, "Thunderstorm with heavy hail"],
])

const describeWeatherCode = (code) => weatherCodeDescriptions.get(Number(code)) ?? "Unknown conditions"

// Friendly wind descriptor from the 10m wind speed in km/h (Open-Meteo default).
const describeWind = (speed) => {
    if (!Number.isFinite(speed)) {
        return null
    }

    if (speed < 5) {
        return "calm"
    }

    if (speed < 16) {
        return "light breeze"
    }

    if (speed < 29) {
        return "gentle breeze"
    }

    if (speed < 39) {
        return "moderate wind"
    }

    if (speed < 62) {
        return "strong wind"
    }

    return "gale"
}

const dayFromDate = (date) => date.toISOString().slice(0, 10)

export const buildWeatherUrl = ({ latitude, longitude, date }) => {
    const url = new URL(openMeteoEndpoint)
    const day = dayFromDate(date)
    const params = {
        latitude: String(latitude),
        longitude: String(longitude),
        timezone,
        start_date: day,
        end_date: day,
        minutely_15: minutelyVariables.join(","),
        daily: dailyVariables.join(","),
    }

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
    }

    return url
}

const requestJson = (url) =>
    new Promise((resolve, reject) => {
        const request = get(url, (response) => {
            let body = ""

            response.setEncoding("utf8")
            response.on("data", (chunk) => {
                body += chunk
            })
            response.on("end", () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`Open-Meteo request failed with HTTP ${response.statusCode}.`))
                    return
                }

                try {
                    resolve(JSON.parse(body))
                } catch {
                    reject(new Error("Open-Meteo returned a response that was not valid JSON."))
                }
            })
        })

        request.on("error", reject)
        request.setTimeout(requestTimeoutMs, () => {
            request.destroy(new Error("Open-Meteo request timed out."))
        })
    })

// Fetch the raw Open-Meteo forecast payload for a photo's location and day.
// The full response is reduced to a single point by nearestWeatherPoint.
export const fetchWeather = async ({ latitude, longitude, date }) => {
    const payload = await requestJson(buildWeatherUrl({ latitude, longitude, date }))

    if (payload?.error) {
        throw new Error(payload.reason || "Open-Meteo returned an error response.")
    }

    if (!payload?.minutely_15?.time?.length) {
        throw new Error("Open-Meteo response did not include 15-minute data.")
    }

    return payload
}

// Index of the 15-minute point closest to the photo's capture instant. The
// minutely_15 times are naive GMT strings ("2026-08-04T16:00") to match the
// UTC-labelled photo date, so both are compared as UTC instants.
const nearestMinutelyIndex = (times, date) => {
    const targetMs = date.getTime()
    let bestIndex = -1
    let bestDiff = Infinity

    times.forEach((time, index) => {
        const pointMs = Date.parse(`${time}:00Z`)

        if (Number.isNaN(pointMs)) {
            return
        }

        const diff = Math.abs(pointMs - targetMs)

        if (diff < bestDiff) {
            bestDiff = diff
            bestIndex = index
        }
    })

    return bestIndex
}

// Reduce parallel arrays (Open-Meteo returns one array per variable) to the
// single value at the given index, leaving any non-array fields untouched.
const collapseSeries = (series, index) => Object.fromEntries(Object.entries(series).map(([key, value]) => [key, Array.isArray(value) ? (value[index] ?? null) : value]))

// Reduce the full-day forecast to just the 15-minute point nearest the photo's
// capture time, plus that day's astronomy. This compact object is what gets
// stored as weather.json — the 96 daily points are not kept.
export const nearestWeatherPoint = (payload, date) => {
    const minutely = payload?.minutely_15

    if (!Array.isArray(minutely?.time) || minutely.time.length === 0) {
        return null
    }

    const index = nearestMinutelyIndex(minutely.time, date)

    if (index === -1) {
        return null
    }

    const point = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        elevation: payload.elevation,
        timezone: payload.timezone,
        utc_offset_seconds: payload.utc_offset_seconds,
        units: payload.minutely_15_units,
        weather: collapseSeries(minutely, index),
    }

    if (Array.isArray(payload.daily?.time)) {
        const dayIndex = payload.daily.time.indexOf(minutely.time[index].slice(0, 10))

        point.daily_units = payload.daily_units
        point.daily = collapseSeries(payload.daily, dayIndex === -1 ? 0 : dayIndex)
    }

    return point
}

// Accept either a raw Open-Meteo payload or an already-collapsed point (as read
// back from weather.json) and always return the compact nearest point.
export const toWeatherPoint = (data, date) => (Array.isArray(data?.minutely_15?.time) ? nearestWeatherPoint(data, date) : data)

// Derive the front matter fields from a collapsed weather point: a short
// conditions summary ("Overcast, gentle breeze") and a separate temperature.
export const describeWeather = (point) => {
    const values = point?.weather

    if (!values) {
        return null
    }

    const parts = [describeWeatherCode(values.weather_code)]
    const wind = describeWind(values.wind_speed_10m)

    if (wind) {
        parts.push(wind)
    }

    const temperature = values.temperature_2m

    return {
        summary: parts.join(", "),
        temperature: Number.isFinite(temperature) ? `${Math.round(temperature)}°C` : null,
    }
}
