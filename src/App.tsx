import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Utensils, 
  Settings as SettingsIcon, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  History,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, Meal, AdminSummary, Settings, UserSummary } from './types';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className, 
  disabled,
  isLoading
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost',
  onClick?: () => void,
  className?: string,
  disabled?: boolean,
  isLoading?: boolean
}) => {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-100',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-slate-100',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'hover:bg-slate-100 text-slate-600'
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled || isLoading}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {isLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  );
};

const Input = ({ label, icon: Icon, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
      <input 
        {...props}
        className={cn(
          "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none",
          Icon && "pl-10",
          props.className
        )}
      />
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'admin'>('login');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        // Backup token if returned directly (updating backend to do this)
        if (data.token) localStorage.setItem('token', data.token);
        setUser(data.user);
        setView('dashboard');
        fetchMeals();
        if (data.user.role === 'admin') fetchAdminSummary();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Login failed");
    }
  };

  const register = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Registration successful! Please login.");
        setView('login');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Registration failed");
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setView('login');
  };

  const authenticatedFetch = (url: string, options: any = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setView('dashboard');
        fetchMeals();
        if (data.user.role === 'admin') fetchAdminSummary();
      }
    } catch (err) {
      console.error("Auth check failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeals = async () => {
    try {
      const res = await authenticatedFetch('/api/meals');
      if (res.ok) {
        const data = await res.json();
        setMeals(data);
      }
    } catch (err) {
      console.error("Fetch meals failed");
    }
  };

  const fetchAdminSummary = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/summary');
      if (res.ok) {
        const data = await res.json();
        setAdminSummary(data);
      }
    } catch (err) {
      console.error("Fetch admin summary failed");
    }
  };

  const markMeal = async (mealType: 'Lunch' | 'Dinner') => {
    setError(null);
    setSuccess(null);
    const date = format(new Date(), 'yyyy-MM-dd');
    try {
      const res = await authenticatedFetch('/api/meals/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, date })
      });
      const data = await res.json();
      if (res.ok) {
        setMeals([...meals, data]);
        setSuccess(`${mealType} marked successfully!`);
        if (user?.role === 'admin') fetchAdminSummary();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to mark meal");
    }
  };

  const updateSettings = async (lunchPrice: number, dinnerPrice: number) => {
    try {
      const res = await authenticatedFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lunchPrice, dinnerPrice })
      });
      if (res.ok) {
        fetchAdminSummary();
        setSuccess("Settings updated");
      }
    } catch (err) {
      setError("Failed to update settings");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Initializing MessMeal...</p>
        </div>
      </div>
    );
  }

  // --- Views ---

  const AuthView = () => (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center p-16 bg-brand-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
            <Utensils className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">Smart Meal<br/>Tracking.</h1>
            <p className="text-xl text-brand-100 max-w-md font-light leading-relaxed">
              Effortlessly track your daily meals, manage group contributions, and generate monthly reports with precision.
            </p>
          </div>
          <div className="pt-12 grid grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-bold">100%</p>
              <p className="text-xs uppercase tracking-widest text-brand-200 font-semibold">Reliable</p>
            </div>
            <div>
              <p className="text-3xl font-bold">Zero</p>
              <p className="text-xs uppercase tracking-widest text-brand-200 font-semibold">Paperwork</p>
            </div>
            <div>
              <p className="text-3xl font-bold">Fast</p>
              <p className="text-xs uppercase tracking-widest text-brand-200 font-semibold">Admin Tools</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">
              {view === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-slate-500">
              {view === 'login' ? 'Enter your details to track your meals' : 'Join your group mess today'}
            </p>
          </div>

          <form onSubmit={view === 'login' ? login : register} className="space-y-5">
            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {success}
              </motion.div>
            )}

            {view === 'register' && (
              <Input label="Full Name" name="name" placeholder="John Doe" icon={UserIcon} required />
            )}
            <Input label="Email address" name="email" type="email" placeholder="name@company.com" icon={UserIcon} required />
            <Input label="Password" name="password" type="password" placeholder="••••••••" icon={UserIcon} required />

            <Button className="w-full py-3" isLoading={false}>
              {view === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            {view === 'login' ? (
              <>Don't have an account? <button onClick={() => setView('register')} className="text-brand-600 font-semibold hover:underline">Register</button></>
            ) : (
              <>Already have an account? <button onClick={() => setView('login')} className="text-brand-600 font-semibold hover:underline">Sign In</button></>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );

  const DashboardView = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayMeals = meals.filter(m => m.date === today);
    const hasLunch = todayMeals.some(m => m.mealType === 'Lunch');
    const hasDinner = todayMeals.some(m => m.mealType === 'Dinner');

    const monthlyMeals = meals.filter(m => m.date.startsWith(format(new Date(), 'yyyy-MM')));
    const monthlyLunch = monthlyMeals.filter(m => m.mealType === 'Lunch').length;
    const monthlyDinner = monthlyMeals.filter(m => m.mealType === 'Dinner').length;

    // Prices from admin settings or default
    const lunchPrice = adminSummary?.settings.lunchPrice || 50;
    const dinnerPrice = adminSummary?.settings.dinnerPrice || 60;
    const estCost = (monthlyLunch * lunchPrice) + (monthlyDinner * dinnerPrice);

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Meal Tracking</h2>
            <p className="text-slate-500 flex items-center gap-2">
              Today is {format(new Date(), 'EEEE, MMMM do')}
            </p>
          </div>
          <div className="flex items-center gap-3">
             {user?.role === 'admin' && (
                <Button variant="outline" onClick={() => setView('admin')} className="gap-2">
                  <TrendingUp className="w-4 h-4" /> Admin Stats
                </Button>
             )}
          </div>
        </div>

        {/* Status Toast */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-3 border shadow-sm",
                error ? "bg-red-50 border-red-100 text-red-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
              )}
            >
              {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              <span className="font-medium">{error || success}</span>
              <button onClick={() => { setError(null); setSuccess(null); }} className="ml-auto opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                <Utensils className="w-6 h-6" />
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                hasLunch ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}>
                {hasLunch ? 'Marked' : 'Not Marked'}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Lunch</h3>
              <p className="text-slate-500 mt-1">Mid-day meal subscription</p>
            </div>
            <Button 
              className="w-full py-4 text-lg" 
              disabled={hasLunch}
              onClick={() => markMeal('Lunch')}
            >
              {hasLunch ? 'Lunch Marked' : 'Mark Lunch'}
            </Button>
          </Card>

          <Card className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Moon className="w-6 h-6" />
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                hasDinner ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}>
                {hasDinner ? 'Marked' : 'Not Marked'}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Dinner</h3>
              <p className="text-slate-500 mt-1">Evening meal subscription</p>
            </div>
            <Button 
              className="w-full py-4 text-lg" 
              variant="primary" 
              disabled={hasDinner}
              onClick={() => markMeal('Dinner')}
            >
              {hasDinner ? 'Dinner Marked' : 'Mark Dinner'}
            </Button>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Meals</p>
                <p className="text-2xl font-bold text-slate-900">{monthlyMeals.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">L / D Ratio</p>
                <p className="text-2xl font-bold text-slate-900">{monthlyLunch} / {monthlyDinner}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-brand-600 text-white shadow-lg shadow-brand-200 border-none">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-200 uppercase tracking-wider">Est. Monthly Bill</p>
                <p className="text-2xl font-bold">${estCost.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-bottom border-slate-100 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <History className="w-4 h-4" /> Recent History
            </h3>
            <span className="text-xs text-slate-400 font-mono">Last 5 entries</span>
          </div>
          <div className="divide-y divide-slate-100">
            {meals.slice(-5).reverse().map(meal => (
              <div key={meal.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                   <div className={cn(
                     "w-10 h-10 rounded-full flex items-center justify-center",
                     meal.mealType === 'Lunch' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                   )}>
                     {meal.mealType === 'Lunch' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                   </div>
                   <div>
                     <p className="font-semibold text-slate-900">{meal.mealType}</p>
                     <p className="text-sm text-slate-500">{format(new Date(meal.date), 'MMM do, yyyy')}</p>
                   </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-slate-400">{format(new Date(meal.timestamp), 'HH:mm')}</p>
                </div>
              </div>
            ))}
            {meals.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No meals recorded yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const AdminView = () => {
    if (!adminSummary) return null;

    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight italic">Admin Console</h2>
            <p className="text-slate-500">Comprehensive overview of all users and costs</p>
          </div>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{adminSummary.summary.length}</span>
              <span className="text-xs text-slate-400 font-medium">Active</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Lunch</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{adminSummary.totalStats.totalLunch}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Dinner</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-brand-600">{adminSummary.totalStats.totalDinner}</span>
            </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg">
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">Current Revenue</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                ${adminSummary.summary.reduce((acc, curr) => acc + curr.totalCost, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
               <SettingsIcon className="w-5 h-5 text-brand-600" /> Price Configuration
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lunch Price ($)</label>
              <input 
                type="number" 
                defaultValue={adminSummary.settings.lunchPrice}
                onBlur={(e) => updateSettings(Number(e.target.value), adminSummary.settings.dinnerPrice)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dinner Price ($)</label>
              <input 
                type="number" 
                defaultValue={adminSummary.settings.dinnerPrice}
                onBlur={(e) => updateSettings(adminSummary.settings.lunchPrice, Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-bold"
              />
            </div>
          </div>
        </Card>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">User Management Log</h3>
            <span className="text-brand-600 text-xs font-bold uppercase tracking-wider">Current Month Statistics</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3 text-center">Lunch</th>
                  <th className="px-6 py-3 text-center">Dinner</th>
                  <th className="px-6 py-3 text-center">Total</th>
                  <th className="px-6 py-3 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminSummary.summary.map(u => (
                  <tr key={u.id} className="text-sm hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{u.lunchCount}</td>
                    <td className="px-6 py-4 text-center font-medium">{u.dinnerCount}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">{u.totalMeals}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-brand-700 font-extrabold uppercase">${u.totalCost.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  const Nav = () => (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
          <Utensils className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-900">MessMeal</span>
      </div>

      <div className="hidden md:flex items-center gap-6">
        <button onClick={() => setView('dashboard')} className={cn("text-sm font-semibold transition-colors", view === 'dashboard' ? "text-brand-600" : "text-slate-500 hover:text-slate-900")}>Dashboard</button>
        {user?.role === 'admin' && (
          <button onClick={() => setView('admin')} className={cn("text-sm font-semibold transition-colors", view === 'admin' ? "text-brand-600" : "text-slate-500 hover:text-slate-900")}>Admin</button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-sm font-bold text-slate-900">{user?.name}</p>
          <p className="text-[10px] uppercase font-bold tracking-widest text-brand-600">{user?.role}</p>
        </div>
        <button onClick={logout} className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );

  if (view === 'login' || view === 'register') {
    return <AuthView />;
  }

  return (
    <div className="bg-slate-50 min-h-screen flex font-sans text-slate-900 overflow-hidden relative">
      {/* Sidebar Navigation */}
      <aside className={cn(
        "bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform lg:translate-x-0 lg:static lg:block w-64",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center font-bold text-lg">M</div>
            <span className="font-semibold text-xl tracking-tight">MessManager</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 transition-colors rounded-lg font-medium text-left",
              view === 'dashboard' 
                ? "bg-brand-600/10 text-brand-400 border-l-4 border-brand-500" 
                : "text-slate-400 hover:text-white"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            User Dashboard
          </button>
          
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrator</div>
          <button 
            onClick={() => {
              if (user?.role === 'admin') {
                setView('admin');
                setIsSidebarOpen(false);
              } else {
                setError("Access restricted to admins only.");
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 transition-colors rounded-lg font-medium text-left",
              view === 'admin' 
                ? "bg-brand-600/10 text-brand-400 border-l-4 border-brand-500" 
                : "text-slate-400 hover:text-white"
            )}
          >
            <Users className="w-5 h-5" />
            All Users
          </button>
          <button 
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors rounded-lg font-medium text-left"
          >
            <History className="w-5 h-5" />
            Meal History
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white font-medium truncate">{user?.name}</span>
              <span className="text-slate-500 text-xs capitalize">{user?.role} User</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800">
              {view === 'dashboard' ? 'Monthly Overview' : 'Admin Panel'} — {format(new Date(), 'MMMM yyyy')}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-500 hidden md:block italic text-nowrap">Server Time: {format(new Date(), 'hh:mm aa')}</span>
            <button 
              onClick={logout}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium transition-colors border border-slate-300"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' ? <DashboardView /> : <AdminView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
