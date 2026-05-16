import { Cloud, Droplets, Wind, X } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
}

export function WeatherCard({ data, onClose }: { data: WeatherData; onClose: () => void }) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-xl p-6 text-white animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold">{data.location}</h3>
          <p className="text-blue-100">{data.conditions}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="text-5xl font-bold mb-6">
        {data.temperature}°F
      </div>
      
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
            <p className="font-semibold">{data.windSpeed} mph</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-blue-400/30 text-sm text-blue-100">
        🎯 AG-UI: Pre-built React component
      </div>
    </div>
  );
}
