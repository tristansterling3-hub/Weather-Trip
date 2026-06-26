# Weather-Trip
A small program for tracking weather on spontaneous trips, built with React + Vite.
 ![SponTrip Dashboard](SponTrip.mp3).

Search any destination and get a 14-day weather outlook — the first 7 days 
are live forecast data, and days 8–14 show 30-year historical averages, so 
You know what to realistically expect without false precision.

## Features

- Destination search with autocomplete
- 7-day live forecast via Open-Meteo
- Smart packing suggestions based on temperature and rain
- Shareable trip summary

## Tech Stack

- React + Vite
- Open-Meteo Forecast API (free, no API key required)
- Open-Meteo Climate API for historical averages
- Open-Meteo Geocoding API for destination search

## Planned

- iOS and Android home screen widget for at-a-glance trip weather
- OG image generation for social sharing
- Trip feed — see where others are heading this week

## Run locally

```bash
npm install
npm run dev
```
