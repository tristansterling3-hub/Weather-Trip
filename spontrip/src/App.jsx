import { useState, useRef } from 'react'
import './App.css'

const WMO_ICON = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '❄️', 75: '❄️',
  80: '🌧️', 81: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

const WMO_LABEL = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Showers', 81: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Hail', 99: 'Heavy hail',
}

function getSeason(lat, month) {
  const s = lat < 0
    ? ['Summer','Summer','Autumn','Autumn','Autumn','Winter','Winter','Winter','Spring','Spring','Spring','Summer']
    : ['Winter','Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Autumn','Autumn','Winter']
  return s[month]
}

function getHistoricalAvgs(hData, month) {
  if (!hData?.daily) return null
  const { time, temperature_2m_max, temperature_2m_min } = hData.daily
  const maxes = [], mins = []
  time.forEach((d, i) => {
    if (new Date(d).getMonth() === month) {
      if (temperature_2m_max[i] != null) maxes.push(temperature_2m_max[i])
      if (temperature_2m_min[i] != null) mins.push(temperature_2m_min[i])
    }
  })
  if (!maxes.length) return null
  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  return { hi: avg(maxes), lo: avg(mins) }
}

function packingTags(avgHi, rainDays) {
  const tags = []
  if (avgHi < 5) tags.push('Heavy coat', 'Thermal layers', 'Gloves & hat')
  else if (avgHi < 12) tags.push('Warm jacket', 'Layers')
  else if (avgHi < 20) tags.push('Light jacket', 'Layers')
  else if (avgHi < 28) tags.push('Light clothing')
  else tags.push('Light clothing', 'Sunscreen', 'Hat')
  if (rainDays >= 2) tags.push('Rain jacket', 'Umbrella')
  if (avgHi > 18) tags.push('Sunglasses')
  tags.push('Comfortable shoes')
  return tags
}

function DayCell({ day }) {
  if (day.type === 'forecast') {
    return (
      <div className="day-cell forecast">
        <div className="day-label">{day.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)} {day.date.getDate()}</div>
        <div className="day-icon">{WMO_ICON[day.code] ?? '🌡️'}</div>
        <div className="day-hi">{day.hi}°</div>
        <div className="day-lo">{day.lo}°</div>
        <div className="day-desc">{WMO_LABEL[day.code] ?? ''}</div>
      </div>
    )
  }
  return (
    <div className="day-cell historical" title="30-year historical average">
      <div className="day-label">{day.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)} {day.date.getDate()}</div>
      <div className="day-icon">📊</div>
      <div className="day-hi">{day.hi != null ? `${day.hi}°` : '—'}</div>
      <div className="day-lo">{day.lo != null ? `${day.lo}°` : '—'}</div>
      <div className="day-desc">Avg</div>
    </div>
  )
}

function TripCard({ fData, hData, place }) {
  const [copied, setCopied] = useState(false)
  const { name, admin1, country, lat } = place
  const fd = fData.daily
  const today = new Date()
  const month = today.getMonth()
  const season = getSeason(lat, month)
  const location = [name, admin1, country].filter(Boolean).join(', ')

  const forecastDays = fd.time.map((d, i) => ({
    date: new Date(d + 'T12:00:00'),
    hi: Math.round(fd.temperature_2m_max[i]),
    lo: Math.round(fd.temperature_2m_min[i]),
    code: fd.weathercode[i],
    precip: fd.precipitation_sum[i] || 0,
    type: 'forecast',
  }))

  const days8to14 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + 7 + i)
    const avgs = getHistoricalAvgs(hData, d.getMonth())
    return { date: d, hi: avgs?.hi ?? null, lo: avgs?.lo ?? null, type: 'historical' }
  })

  const rainDays = forecastDays.filter(d => d.precip > 1).length
  const avgHi = Math.round(forecastDays.reduce((s, d) => s + d.hi, 0) / forecastDays.length)
  const histAvg = getHistoricalAvgs(hData, month)
  const bestDays = forecastDays
    .filter(d => d.precip < 1 && d.code <= 3)
    .map(d => d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))

  const dateEnd = new Date(today)
  dateEnd.setDate(today.getDate() + 13)
  const dateRange = `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dateEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const alertMsg = bestDays.length
    ? `Best days: ${bestDays.slice(0, 3).join(', ')}.${rainDays >= 2 ? ` Pack rain gear — ${rainDays} rainy days expected.` : ''}`
    : rainDays >= 2 ? `${rainDays} rainy days expected. Pack waterproof gear.` : 'Looks clear all week.'

  const tags = packingTags(avgHi, rainDays)

  function handleCopy() {
    const text = `${location} · ${dateRange} · ${season}\nAvg high: ${avgHi}°C · Rainy days: ${rainDays}/7\nPlanned with SponTrip`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="card">
      <div className="dest-header">
        <div>
          <div className="dest-name">📍 {location}</div>
          <div className="dest-sub">{dateRange} · {season}</div>
        </div>
        <span className="season-badge">{season}</span>
      </div>

      <p className="section-label">Days 1–7 · live forecast</p>
      <div className="day-grid">
        {forecastDays.map((d, i) => <DayCell key={i} day={d} />)}
      </div>

      <p className="section-label">Days 8–14 · historical average</p>
      <div className="day-grid">
        {days8to14.map((d, i) => <DayCell key={i} day={d} />)}
      </div>

      <div className="legend">
        <span className="legend-item"><span className="dot forecast-dot" />Live forecast</span>
        <span className="legend-item"><span className="dot historical-dot" />30-year avg (1991–2020)</span>
      </div>

      <div className="alert">
        ℹ️ {alertMsg}
      </div>

      <p className="section-label">Trip summary</p>
      <div className="stats-row">
        <div className="stat"><div className="stat-label">Avg high this week</div><div className="stat-val">{avgHi}°C</div></div>
        <div className="stat"><div className="stat-label">Rainy days</div><div className="stat-val">{rainDays} of 7</div></div>
        <div className="stat"><div className="stat-label">Typical high</div><div className="stat-val">{histAvg ? `${histAvg.hi}°C` : '—'}</div></div>
      </div>

      <p className="section-label">Pack this</p>
      <div className="pack-row">
        {tags.map((t, i) => <span key={i} className="pack-tag">{t}</span>)}
      </div>

      <div className="action-row">
        <button className="btn primary" onClick={handleCopy}>
          {copied ? '✓ Copied!' : '↑ Share this trip'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const debounceRef = useRef(null)

  function handleInput(val) {
    setQuery(val)
    setSelectedPlace(null)
    setError('')
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  async function fetchSuggestions(q) {
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`)
      const d = await r.json()
      setSuggestions(d.results || [])
    } catch { setSuggestions([]) }
  }

  function pickPlace(place) {
    setSelectedPlace(place)
    setQuery([place.name, place.admin1, place.country].filter(Boolean).join(', '))
    setSuggestions([])
    runFetch(place)
  }

  async function handleSearch() {
    if (selectedPlace) { runFetch(selectedPlace); return }
    if (!query.trim()) return
    setLoading(true)
    await fetchSuggestions(query)
    // fetchSuggestions updates state async — re-read via a direct call
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`)
      const d = await r.json()
      const results = d.results || []
      if (!results.length) { setError("Couldn't find that place. Try being more specific."); setLoading(false); return }
      const place = results[0]
      setSelectedPlace(place)
      setQuery([place.name, place.admin1, place.country].filter(Boolean).join(', '))
      setSuggestions([])
      runFetch(place)
    } catch { setError('Something went wrong. Try again.'); setLoading(false) }
  }

  async function runFetch(place) {
    setLoading(true)
    setError('')
    setResult(null)
    const { latitude: lat, longitude: lon, timezone } = place
    const tz = encodeURIComponent(timezone || 'UTC')
    try {
      const [fRes, hRes] = await Promise.allSettled([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=${tz}&forecast_days=7`),
        fetch(`https://climate-api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lon}&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&models=EC_Earth3P_HR`)
      ])
      const fData = fRes.status === 'fulfilled' ? await fRes.value.json() : null
      const hData = hRes.status === 'fulfilled' ? await hRes.value.json() : null
      if (!fData?.daily) { setError('Forecast unavailable for this location.'); return }
      setResult({ fData, hData, place })
    } catch { setError('Something went wrong fetching the forecast. Try again.') }
    finally { setLoading(false) }
  }

  function reset() {
    setQuery(''); setSuggestions([]); setSelectedPlace(null)
    setResult(null); setError('')
  }

  return (
    <div className="app">
      <div className="header">
        <h1>SponTrip</h1>
        <p>2-week weather outlook for wherever you're headed</p>
      </div>

      <div className="search-wrap">
        <input
          type="text"
          value={query}
          placeholder="Where to? e.g. Tokyo, Lisbon, Queenstown"
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          autoComplete="off"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Loading…' : 'Get forecast'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <div key={i} className="suggestion" onClick={() => pickPlace(s)}>
              📍 {s.name} <span>{[s.admin1, s.country].filter(Boolean).join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}

      {loading && <div className="loading">Fetching forecast…</div>}

      {result && (
        <>
          <TripCard {...result} />
          <button className="btn secondary reset-btn" onClick={reset}>Search again</button>
        </>
      )}
    </div>
  )
}
