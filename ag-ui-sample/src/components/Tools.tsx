'use client'

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { WeatherCard } from './WeatherCard';
import { ProfileCard } from './ProfileCard';
import { ChartCard } from './ChartCard';
import { useState } from 'react';

export function Tools() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [uiState, setUiState] = useState({
    sidebarOpen: true,
    theme: 'light' as 'light' | 'dark',
    counter: 0,
    notifications: [] as string[],
    activePanel: 'main' as 'main' | 'settings' | 'help',
  });

  // Make UI state readable by the agent
  useCopilotReadable({
    description: 'Current UI state including sidebar, theme, counter, and active panel',
    value: uiState,
  });

  // Weather Tool (Server-side data)
  useCopilotAction({
    name: 'get_weather',
    description: 'Get current weather information for a location. Returns temperature, conditions, humidity, and wind speed.',
    parameters: [{
      name: 'location',
      type: 'string',
      description: 'The city or location to get weather for',
      required: true,
    }],
    handler: async ({ location }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const weather = {
        location,
        temperature: Math.floor(Math.random() * 30) + 50,
        conditions: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 20) + 5,
      };
      
      setWeatherData(weather);
      return JSON.stringify(weather);
    },
  });

  // Profile Tool
  useCopilotAction({
    name: 'get_user_profile',
    description: 'Display user profile information including name, email, role, and join date.',
    parameters: [{
      name: 'email',
      type: 'string',
      description: 'Email address of the user',
      required: true,
    }],
    handler: async ({ email }) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const profile = {
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        email,
        role: ['Developer', 'Designer', 'Product Manager', 'Engineer'][Math.floor(Math.random() * 4)],
        joinDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toLocaleDateString(),
        avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`,
      };
      
      setProfileData(profile);
      return JSON.stringify(profile);
    },
  });

  // Chart Tool
  useCopilotAction({
    name: 'create_chart',
    description: 'Create a bar chart visualization with the provided data values.',
    parameters: [
      {
        name: 'values',
        type: 'array',
        description: 'Array of numeric values to chart',
        required: true,
      },
      {
        name: 'labels',
        type: 'array',
        description: 'Optional labels for each value',
        required: false,
      },
      {
        name: 'title',
        type: 'string',
        description: 'Chart title',
        required: false,
      },
    ],
    handler: async ({ values, labels, title }) => {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const chartInfo = {
        values: Array.isArray(values) ? values : [values],
        labels: labels || values.map((_: any, i: number) => `Item ${i + 1}`),
        title: title || 'Data Chart',
      };
      
      setChartData(chartInfo);
      return JSON.stringify(chartInfo);
    },
  });

  // CLIENT-SIDE LOCAL TOOLS - These manipulate UI state directly

  // Toggle Sidebar Tool
  useCopilotAction({
    name: 'toggle_sidebar',
    description: 'Toggle the sidebar open or closed. Use to show/hide navigation.',
    parameters: [{
      name: 'open',
      type: 'boolean',
      description: 'True to open sidebar, false to close it. If not provided, toggles current state.',
      required: false,
    }],
    handler: async ({ open }) => {
      const newState = open !== undefined ? open : !uiState.sidebarOpen;
      setUiState(prev => ({ ...prev, sidebarOpen: newState }));
      return `Sidebar ${newState ? 'opened' : 'closed'}`;
    },
  });

  // Change Theme Tool
  useCopilotAction({
    name: 'change_theme',
    description: 'Change the UI theme between light and dark mode.',
    parameters: [{
      name: 'theme',
      type: 'string',
      description: 'Theme to apply: "light" or "dark"',
      required: true,
    }],
    handler: async ({ theme }) => {
      if (theme !== 'light' && theme !== 'dark') {
        return 'Invalid theme. Use "light" or "dark".';
      }
      setUiState(prev => ({ ...prev, theme }));
      return `Theme changed to ${theme} mode`;
    },
  });

  // Update Counter Tool
  useCopilotAction({
    name: 'update_counter',
    description: 'Increment, decrement, or set the counter value.',
    parameters: [
      {
        name: 'action',
        type: 'string',
        description: 'Action to perform: "increment", "decrement", or "set"',
        required: true,
      },
      {
        name: 'value',
        type: 'number',
        description: 'Value to set (only used with "set" action)',
        required: false,
      },
    ],
    handler: async ({ action, value }) => {
      let newCounter = uiState.counter;
      
      if (action === 'increment') {
        newCounter += 1;
      } else if (action === 'decrement') {
        newCounter -= 1;
      } else if (action === 'set' && value !== undefined) {
        newCounter = value;
      } else {
        return 'Invalid action or missing value for set operation';
      }
      
      setUiState(prev => ({ ...prev, counter: newCounter }));
      return `Counter updated to ${newCounter}`;
    },
  });

  // Add Notification Tool
  useCopilotAction({
    name: 'add_notification',
    description: 'Add a notification message to the UI notification list.',
    parameters: [{
      name: 'message',
      type: 'string',
      description: 'Notification message to display',
      required: true,
    }],
    handler: async ({ message }) => {
      setUiState(prev => ({
        ...prev,
        notifications: [...prev.notifications, message],
      }));
      return `Notification added: "${message}"`;
    },
  });

  // Clear Notifications Tool
  useCopilotAction({
    name: 'clear_notifications',
    description: 'Clear all notifications from the UI.',
    parameters: [],
    handler: async () => {
      setUiState(prev => ({ ...prev, notifications: [] }));
      return 'All notifications cleared';
    },
  });

  // Switch Panel Tool
  useCopilotAction({
    name: 'switch_panel',
    description: 'Switch to a different panel/view in the UI.',
    parameters: [{
      name: 'panel',
      type: 'string',
      description: 'Panel to switch to: "main", "settings", or "help"',
      required: true,
    }],
    handler: async ({ panel }) => {
      if (!['main', 'settings', 'help'].includes(panel)) {
        return 'Invalid panel. Use "main", "settings", or "help"';
      }
      setUiState(prev => ({ ...prev, activePanel: panel as any }));
      return `Switched to ${panel} panel`;
    },
  });

  // Reset UI Tool
  useCopilotAction({
    name: 'reset_ui',
    description: 'Reset all UI state to default values.',
    parameters: [],
    handler: async () => {
      setUiState({
        sidebarOpen: true,
        theme: 'light',
        counter: 0,
        notifications: [],
        activePanel: 'main',
      });
      setWeatherData(null);
      setProfileData(null);
      setChartData(null);
      return 'UI reset to default state';
    },
  });

  return (
    <>
      {/* UI State Display */}
      <div
        className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl z-20 transition-all ${
          uiState.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}
      >
        <h3 className="font-bold mb-2 text-sm">🎛️ UI State</h3>
        <div className="space-y-1 text-xs">
          <div>Sidebar: {uiState.sidebarOpen ? '✅ Open' : '❌ Closed'}</div>
          <div>Theme: {uiState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</div>
          <div>Counter: {uiState.counter}</div>
          <div>Panel: {uiState.activePanel}</div>
          <div>Notifications: {uiState.notifications.length}</div>
        </div>
      </div>

      {/* Sidebar */}
      {uiState.sidebarOpen && (
        <div
          className={`fixed left-0 top-0 h-full w-64 p-6 shadow-xl z-10 transition-all ${
            uiState.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
          }`}
        >
          <h2 className="text-xl font-bold mb-4">Navigation</h2>
          <div className="space-y-2">
            <button
              onClick={() => setUiState(prev => ({ ...prev, activePanel: 'main' }))}
              className={`w-full text-left px-4 py-2 rounded ${
                uiState.activePanel === 'main'
                  ? 'bg-blue-500 text-white'
                  : uiState.theme === 'dark'
                  ? 'hover:bg-gray-800'
                  : 'hover:bg-gray-200'
              }`}
            >
              🏠 Main
            </button>
            <button
              onClick={() => setUiState(prev => ({ ...prev, activePanel: 'settings' }))}
              className={`w-full text-left px-4 py-2 rounded ${
                uiState.activePanel === 'settings'
                  ? 'bg-blue-500 text-white'
                  : uiState.theme === 'dark'
                  ? 'hover:bg-gray-800'
                  : 'hover:bg-gray-200'
              }`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setUiState(prev => ({ ...prev, activePanel: 'help' }))}
              className={`w-full text-left px-4 py-2 rounded ${
                uiState.activePanel === 'help'
                  ? 'bg-blue-500 text-white'
                  : uiState.theme === 'dark'
                  ? 'hover:bg-gray-800'
                  : 'hover:bg-gray-200'
              }`}
            >
              ❓ Help
            </button>
          </div>

          <div className="mt-6">
            <div className="font-semibold mb-2">Counter</div>
            <div className="text-3xl font-bold text-blue-500">{uiState.counter}</div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {uiState.notifications.length > 0 && (
        <div className="fixed top-20 right-4 w-80 space-y-2 z-20">
          {uiState.notifications.map((notification, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg shadow-xl ${
                uiState.theme === 'dark'
                  ? 'bg-blue-900 text-white'
                  : 'bg-blue-100 text-blue-900'
              }`}
            >
              <div className="flex justify-between items-start">
                <span>{notification}</span>
                <button
                  onClick={() => {
                    setUiState(prev => ({
                      ...prev,
                      notifications: prev.notifications.filter((_, i) => i !== index),
                    }));
                  }}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      <div className={`fixed bottom-24 left-8 space-y-4 max-w-md z-10 ${uiState.sidebarOpen ? 'ml-64' : ''}`}>
        {weatherData && <WeatherCard data={weatherData} onClose={() => setWeatherData(null)} />}
        {profileData && <ProfileCard data={profileData} onClose={() => setProfileData(null)} />}
        {chartData && <ChartCard data={chartData} onClose={() => setChartData(null)} />}
      </div>
    </>
  );
}
