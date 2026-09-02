
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Database,
  Bell,
  User,
} from 'lucide-react';
import logo from '../assets/logo/PONOS_compass_1024x1024.png';

export function Header() {
  // Dynamisk styling baseret på om ruten er aktiv
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-md text-base font-medium transition-colors ${
      isActive
        ? 'text-white border-b-2 border-white rounded-b-none'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
    }`;

  return (
    <header className="w-full bg-[#0B132A] text-white px-8 py-6 flex items-center justify-between border-b border-slate-800 min-h-[90px] shadow-md">
      {/* Logo -> Går til /dashboard */}
      <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <img src={logo} alt="PONOS Logo" className="w-16 h-16 object-contain" />
        <span className="text-3xl font-serif tracking-[0.25em] font-semibold text-slate-100">
          PONOS
        </span>
      </Link>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        <NavLink to="/dashboard" className={getNavLinkClass}>
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/tasks" className={getNavLinkClass}>
          <ClipboardList className="w-5 h-5" />
          <span>Opgaver</span>
        </NavLink>

        <NavLink to="/" className={getNavLinkClass}>
          <BarChart3 className="w-5 h-5" />
          <span>Statistik</span>
        </NavLink>

        <NavLink to="/datalager" className={getNavLinkClass}>
          <Database className="w-5 h-5" />
          <span>Datalager</span>
        </NavLink>
      </nav>

      {/* Højre side: Notifikation Ikon + Bruger Profil */}
      <div className="flex items-center gap-5">
        {/* Notifikationsikon -> Går til /notifikationer */}
        <Link 
          to="/notifikationer" 
          className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors"
          aria-label="Notifikationer"
        >
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 bg-[#C7975D] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
          
          </span>
        </Link>

        {/* Bruger Profil -> Går til /bruger */}
        <Link 
          to="/bruger" 
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-semibold">
            <User className="w-6 h-6 text-slate-700" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-semibold leading-tight">Bruger</span>
            <span className="text-xs text-slate-400">Medarbejder</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
