import axios from 'axios';

export interface WeatherData {
  cityName: string;
  temperature: number;
  description: string;
  emoji: string;
}

export class WeatherService {
  private static weatherCodeMap: Record<number, { desc: string; emoji: string }> = {
    0: { desc: 'Clear sky', emoji: '☀️' },
    1: { desc: 'Mainly clear', emoji: '🌤️' },
    2: { desc: 'Partly cloudy', emoji: '⛅' },
    3: { desc: 'Overcast', emoji: '☁️' },
    45: { desc: 'Foggy', emoji: '🌫️' },
    48: { desc: 'Depositing rime fog', emoji: '🌫️' },
    51: { desc: 'Light drizzle', emoji: '🌦️' },
    53: { desc: 'Moderate drizzle', emoji: '🌧️' },
    55: { desc: 'Dense drizzle', emoji: '🌧️' },
    61: { desc: 'Slight rain', emoji: '🌧️' },
    63: { desc: 'Moderate rain', emoji: '🌧️' },
    65: { desc: 'Heavy rain', emoji: '🌧️' },
    71: { desc: 'Slight snow', emoji: '🌨️' },
    73: { desc: 'Moderate snow', emoji: '🌨️' },
    75: { desc: 'Heavy snow', emoji: '❄️' },
    80: { desc: 'Rain showers', emoji: '🌦️' },
    95: { desc: 'Thunderstorm', emoji: '⛈️' },
  };

  static async getWeather(lat = 37.7749, lon = -122.4194, cityName = 'San Francisco, CA'): Promise<WeatherData | null> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const res = await axios.get(url, { timeout: 5000 });
      const current = res.data?.current_weather;
      if (!current) return null;

      const code = current.weathercode;
      const details = this.weatherCodeMap[code] || { desc: 'Clear', emoji: '☀️' };

      return {
        cityName,
        temperature: Math.round(current.temperature),
        description: details.desc,
        emoji: details.emoji,
      };
    } catch {
      return null;
    }
  }
}
