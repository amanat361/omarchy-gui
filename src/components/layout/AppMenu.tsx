import { 
  Monitor, 
  Mouse, 
  Keyboard, 
  Settings, 
  Wifi, 
  Volume2, 
  Palette,
  RefreshCw,
  Info,
  type LucideIcon 
} from 'lucide-react';
import { useState } from 'react';

interface MenuCategory {
  id: string;
  name: string;
  icon: LucideIcon;
}

const categories: MenuCategory[] = [
  { id: 'display', name: 'Display', icon: Monitor },
  { id: 'input', name: 'Input', icon: Mouse },
  { id: 'keybinds', name: 'Keybinds', icon: Keyboard },
  { id: 'system', name: 'System', icon: Settings },
  { id: 'network', name: 'Network', icon: Wifi },
  { id: 'audio', name: 'Audio', icon: Volume2 },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'about', name: 'About', icon: Info },
];

interface AppMenuProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function AppMenu({ activeCategory, onCategoryChange }: AppMenuProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshHyprland = async () => {
    try {
      setIsRefreshing(true);
      
      const response = await fetch('/api/hyprctl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'reload' })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Hyprland refresh failed');
      }

      console.log('Hyprland refreshed successfully');
    } catch (error) {
      console.error('Hyprland refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 h-20">
        <h1 className="text-xl font-semibold text-gray-900">Omarchy</h1>
        <p className="text-sm text-gray-500 mt-1">System Settings</p>
      </div>
      <nav className="p-3 flex-1">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm transition-all duration-150 rounded-md mb-1 ${
                activeCategory === category.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              {category.name}
            </button>
          );
        })}
      </nav>
      
      {/* Refresh Hyprland Button at Bottom */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleRefreshHyprland}
          disabled={isRefreshing}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm transition-all duration-150 rounded-md ${
            isRefreshing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
          }`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Hyprland'}
        </button>
      </div>
    </div>
  );
}