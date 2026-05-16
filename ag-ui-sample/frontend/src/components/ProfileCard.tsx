import { Mail, Calendar, Briefcase, X } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  joinDate: string;
  avatar: string;
}

export function ProfileCard({ data, onClose }: { data: ProfileData; onClose: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-xl p-6 border border-gray-200 animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">User Profile</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="flex items-center space-x-4 mb-6">
        <img
          src={data.avatar}
          alt={data.name}
          className="w-16 h-16 rounded-full border-2 border-purple-500"
        />
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{data.name}</h4>
          <p className="text-purple-600 font-medium">{data.role}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3 text-gray-700">
          <Mail size={18} className="text-purple-500" />
          <span className="text-sm">{data.email}</span>
        </div>
        
        <div className="flex items-center space-x-3 text-gray-700">
          <Calendar size={18} className="text-purple-500" />
          <span className="text-sm">Joined {data.joinDate}</span>
        </div>
        
        <div className="flex items-center space-x-3 text-gray-700">
          <Briefcase size={18} className="text-purple-500" />
          <span className="text-sm">{data.role}</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        🎯 AG-UI: Type-safe component with predefined structure
      </div>
    </div>
  );
}
