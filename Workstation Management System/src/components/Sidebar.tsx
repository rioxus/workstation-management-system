import { useState } from 'react';
import { Home, FileText, Plus, CheckSquare, MapPin, Bell, LogOut, BarChart3, Package, Wrench, Calendar, Settings, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userRole: string;
  userName: string;
  pendingCount?: number;
  onLogout: () => void;
}

export function Sidebar({ activePage, onNavigate, userRole, userName, pendingCount = 0, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'manager', 'technical'] },
    { id: 'requests', label: 'System Requests', icon: FileText, roles: ['admin', 'manager', 'technical'] },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare, roles: ['admin'], badge: true },
    { id: 'workstation-management', label: 'Workstation Data', icon: Settings, roles: ['admin'] },
    { id: 'workstations', label: 'Workstation Map', icon: MapPin, roles: ['admin', 'technical'] },
    { id: 'analytics', label: 'AI Analytics', icon: BarChart3, roles: ['admin', 'technical'] },
    { id: 'equipment', label: 'Equipment Inventory', icon: Package, roles: ['technical'] },
    { id: 'technical-tasks', label: 'Technical Tasks', icon: Wrench, roles: ['technical'] },
    { id: 'maintenance', label: 'Maintenance Schedule', icon: Calendar, roles: ['technical'] },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white p-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-400" />
          <h1 className="text-base">Workstation Tracker</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white hover:bg-slate-800"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative
        w-64 bg-slate-900 text-white h-screen flex flex-col
        z-40
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        top-0 md:top-auto
        pt-16 md:pt-0
      `}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-6 h-6 text-blue-400" />
          <h1 className="text-lg">Workstation Tracker</h1>
        </div>
        <div className="mt-3">
          <p className="text-slate-300 text-sm">{userName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              className={`text-xs ${
                userRole === 'admin' 
                  ? 'bg-purple-500' 
                  : userRole === 'manager' 
                  ? 'bg-blue-500' 
                  : 'bg-green-500'
              }`}
            >
              {userRole.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems
          .filter(item => item.roles.includes(userRole))
          .map(item => (
            <Button
              key={item.id}
              variant={activePage === item.id ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${
                activePage === item.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              onClick={() => handleNavigate(item.id)}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
              {item.badge && pendingCount > 0 && (
                <Badge className="ml-auto bg-red-500">{pendingCount}</Badge>
              )}
            </Button>
          ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
    </>
  );
}