import { BarChart, X } from 'lucide-react';

interface ChartData {
  values: number[];
  labels: string[];
  title: string;
}

export function ChartCard({ data, onClose }: { data: ChartData; onClose: () => void }) {
  const maxValue = Math.max(...data.values);
  
  return (
    <div className="bg-white rounded-lg shadow-xl p-6 border border-gray-200 animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <BarChart size={20} className="text-green-600" />
          <h3 className="text-xl font-bold text-gray-800">{data.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="space-y-3">
        {data.values.map((value, index) => {
          const percentage = (value / maxValue) * 100;
          const label = data.labels[index] || `Item ${index + 1}`;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">{label}</span>
                <span className="text-gray-600">{value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                >
                  <span className="text-white text-xs font-semibold">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        🎯 AG-UI: Developer controls visualization style
      </div>
    </div>
  );
}
