import { Button } from './ui/button';
import { MapPin, Shield, Users, Wrench } from 'lucide-react';
import { Card } from './ui/card';
import { SupabaseStatus } from './SupabaseStatus';

interface RoleSelectorProps {
  onSelectRole: (roleName: string) => void;
}

export function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  const allRoles = [
    {
      name: 'Admin',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      description: 'Full system access with approvals and AI analytics',
      features: [
        'View all requests',
        'Approve/reject requests',
        'AI Analytics & Insights',
        'Equipment management',
      ],
    },
    {
      name: 'Manager',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      description: 'Submit workstation allocation requests',
      features: [
        'Submit new requests',
        'View division requests',
        'Track request status',
        'Specify equipment needs',
      ],
    },
    {
      name: 'Technical',
      icon: Wrench,
      color: 'from-green-500 to-green-600',
      description: 'View approved requests and workstation setup',
      features: [
        'View approved requests',
        'Workstation mapping',
        'Equipment tracking',
        'Setup planning',
      ],
    },
  ];

  // Filter to show only Admin and Manager roles (hide Technical for now)
  const roles = allRoles.filter(role => role.name !== 'Technical');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="w-12 h-12 text-blue-400" />
            <h1 className="text-white">Workstation Allotment Tracker</h1>
          </div>
          <p className="text-slate-300 text-lg">Select your role to access the system</p>
          <p className="text-slate-400 text-sm mt-2">600+ WFO Employees • 3 Shifts • 5 Locations</p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.name}
                className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden group"
              >
                <div className={`h-2 bg-gradient-to-r ${role.color}`} />
                
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${role.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white">{role.name}</h3>
                      <p className="text-xs text-slate-400">Role Access</p>
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm mb-4 min-h-[40px]">
                    {role.description}
                  </p>

                  <div className="space-y-2 mb-6">
                    {role.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => onSelectRole(role.name)}
                    className={`w-full bg-gradient-to-r ${role.color} hover:opacity-90 text-white`}
                  >
                    Access as {role.name}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-6 px-6 py-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
            <div className="text-left">
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm text-slate-200">angkik.borthakur@hitechdigital.com</p>
            </div>
            <div className="h-8 w-px bg-slate-600" />
            <div className="text-left">
              <p className="text-xs text-slate-400">Database Status</p>
              <div className="mt-1">
                <SupabaseStatus />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
