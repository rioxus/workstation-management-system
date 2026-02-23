import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Monitor, Eye, EyeOff, User, CheckCircle2, Building2, Users, BarChart3 } from 'lucide-react';
import { db } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface LoginPageProps {
  onLogin: (employee: any) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId.trim() || !password.trim()) {
      toast.error('Please enter both Employee ID and Password');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch all employees and find matching credentials
      const employees = await db.employees.getAll();
      const matchingEmployee = employees.find(
        emp => emp.employee_id.toLowerCase() === employeeId.toLowerCase().trim() && 
               emp.password === password.trim()
      );

      if (!matchingEmployee) {
        toast.error('Invalid Employee ID or Password. Please check your credentials and try again.');
        setPassword('');
        setIsLoading(false);
        return;
      }

      // Check if user has proper role (Admin or Manager)
      if (matchingEmployee.role !== 'Admin' && matchingEmployee.role !== 'Manager') {
        toast.error('Access denied. Only Admin and Manager roles can access this system.');
        setPassword('');
        setIsLoading(false);
        return;
      }

      // Successful login
      toast.success(`Welcome back, ${matchingEmployee.name}!`);
      onLogin(matchingEmployee);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to authenticate. Please check your database connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20">
                <Monitor className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Workstation Tracker</h2>
                <p className="text-xs text-blue-200">Smart Workspace Management</p>
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-6 max-w-md">
              <h1 className="text-5xl font-bold leading-tight">
                Streamline Your
                <span className="block mt-2 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                  Workspace Allocation
                </span>
              </h1>
              <p className="text-lg text-blue-100 leading-relaxed">
                Efficiently manage workstation assignments across multiple divisions, 
                floors, and offices with real-time tracking and automated workflows.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center border border-white/20">
                <Users className="w-5 h-5 text-blue-200" />
              </div>
              <p className="text-sm font-semibold">600+ Employees</p>
              <p className="text-xs text-blue-200">Multi-division support</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center border border-white/20">
                <Building2 className="w-5 h-5 text-blue-200" />
              </div>
              <p className="text-sm font-semibold">5 Locations</p>
              <p className="text-xs text-blue-200">Centralized control</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-lg flex items-center justify-center border border-white/20">
                <BarChart3 className="w-5 h-5 text-blue-200" />
              </div>
              <p className="text-sm font-semibold">Real-time Data</p>
              <p className="text-xs text-blue-200">Live tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Monitor className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Workstation Tracker</h2>
                <p className="text-xs text-slate-600">Smart Workspace Management</p>
              </div>
            </div>
          </div>

          <Card className="bg-white shadow-xl border-0 p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
              <p className="text-slate-600">Sign in to your account to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-slate-700 font-medium text-sm">
                  Employee ID
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="Enter your Employee ID"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    className="pl-10 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 mb-1">Secure Access</p>
                    <p className="text-xs text-slate-600">
                      Only authorized Admin and Manager personnel can access this system. 
                      Contact your administrator for credentials.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-6">
            © 2026 Workstation Allotment Tracker. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}