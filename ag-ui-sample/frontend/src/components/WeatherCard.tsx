import { Cloud, Droplets, Wind, X } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
}

export function WeatherCard({ data, units, onClose }: { data: WeatherData; units: 'metric' | 'imperial'; onClose: () => void }) {
  const temp = units === 'metric'
    ? `${Math.round((data.temperature - 32) * 5 / 9)}°C`
    : `${data.temperature}°F`;
  const wind = units === 'metric'
    ? `${Math.round(data.windSpeed * 1.6)} km/h`
    : `${data.windSpeed} mph`;

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-xl p-6 text-white animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold">{data.location}</h3>
          <p className="text-blue-100">{data.conditions}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{units}</span>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div className="text-5xl font-bold mb-6">{temp}</div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Droplets size={20} className="text-blue-200" />
          <div>
            <p className="text-sm text-blue-200">Humidity</p>
            <p className="font-semibold">{data.humidity}%</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Wind size={20} className="text-blue-200" />
          <div>
            <p className="text-sm text-blue-200">Wind</p>
            <p className="font-semibold">{wind}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-blue-400/30 text-sm text-blue-100">
        🎯 AG-UI: Pre-built component · Client-side state (units: {units})
      </div>
    </div>
  );
}
