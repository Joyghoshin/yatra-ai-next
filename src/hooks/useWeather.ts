import { useQuery } from "@tanstack/react-query";

export interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitation: number;
  isClimate?: boolean; // flag to show it's avg data
}

// Current 7-day forecast
async function fetchForecast(lat: number, lon: number, timezone: string): Promise<WeatherDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=${encodeURIComponent(timezone)}&forecast_days=7`;
  const res = await fetch(url);
  const data = await res.json();
  return data.daily.time.map((date: string, i: number) => ({
    date,
    maxTemp: Math.round(data.daily.temperature_2m_max[i]),
    minTemp: Math.round(data.daily.temperature_2m_min[i]),
    weatherCode: data.daily.weathercode[i],
    precipitation: data.daily.precipitation_sum[i],
    isClimate: false,
  }));
}

// Historical climate averages for future dates
async function fetchClimateAverage(lat: number, lon: number, startDate: string, endDate: string): Promise<WeatherDay[]> {
  // Use last year's same dates for climate baseline
  const start = new Date(startDate);
  const end = new Date(endDate);
  const lastYearStart = new Date(start);
  const lastYearEnd = new Date(end);
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(lastYearStart)}&end_date=${fmt(lastYearEnd)}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.daily) throw new Error("No climate data");

  return data.daily.time.map((date: string, i: number) => {
    // Shift dates back to the actual trip dates
    const originalDate = new Date(date);
    originalDate.setFullYear(originalDate.getFullYear() + 1);
    return {
      date: originalDate.toISOString().split("T")[0],
      maxTemp: Math.round(data.daily.temperature_2m_max[i]),
      minTemp: Math.round(data.daily.temperature_2m_min[i]),
      weatherCode: data.daily.weathercode[i],
      precipitation: Math.round(data.daily.precipitation_sum[i] * 10) / 10,
      isClimate: true,
    };
  });
}

export function useWeather(lat?: number, lon?: number, timezone?: string, startDate?: string, endDate?: string) {
  const isEnabled = !!lat && !!lon;

  // Check if trip is beyond 7 days from now
  const isFuture = startDate
    ? new Date(startDate) > new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  return useQuery({
    queryKey: ["weather", lat, lon, timezone, startDate, endDate, isFuture],
    queryFn: () => {
      if (isFuture && startDate && endDate) {
        return fetchClimateAverage(lat!, lon!, startDate, endDate);
      }
      return fetchForecast(lat!, lon!, timezone || "Asia/Kolkata");
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60, // cache 1 hour for climate data
  });
}

