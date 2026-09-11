import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Database,
  Bell,
  User,
  ChevronDown,
  LogOut,
  UserPlus,
  Building2,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import logo from '../assets/logo/PONOS_compass_1024x1024.png';
import { useGetMyProfileQuery } from '../store/apis/profileApi';
import { useSignOutMutation } from '../store/apis/authApi';
import {
  MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE,
  MANAGE_ROLES_PRIVILEGE,
  useHasPrivilege,
} from '../store/apis/privilegeApi';

export function Header() {
  const navigate = useNavigate();

  // Viser den indloggede brugers eget navn/rolle i stedet for pladsholder-
  // tekst. Er ingen logget ind (eller profilen endnu ikke hentet), falder
  // vi tilbage til en neutral tekst.
  const { data: profile } = useGetMyProfileQuery();
  const [signOut, { isLoading: signingOut }] = useSignOutMutation();

  // Anmodninger og Roller gates nu uafhængigt af hinanden - hver kræver
  // kun sit eget privilegie (admin har som altid begge). Skjuler kun
  // linket - den reelle adgangskontrol ligger i RLS.
  const { hasPrivilege: canManageMembershipRequests } = useHasPrivilege(MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE);
  const { hasPrivilege: canManageRoles } = useHasPrivilege(MANAGE_ROLES_PRIVILEGE);

  // Bruger-dropdown: "Se profil" + "Log ud"
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mobil hamburger-navigation
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Luk brugermenuen ved klik udenfor eller Escape, så den ikke bliver
  // hængende åben når brugeren navigerer videre i siden.
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Luk mobil-menuen automatisk, hvis vinduet bliver bredt nok til desktop-nav (lg = 1024px)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setMobileNavOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    setMobileNavOpen(false);
    await signOut();
    // Auth-listeneren rydder cachen; her sikrer vi bare at brugeren ikke
    // bliver stående på en beskyttet side efter logout.
    navigate('/login');
  }

  // Dynamisk styling baseret på om ruten er aktiv. Kompakt ved lg, mere
  // luftig ved xl, så nav'en holder sig synlig på flere skærmstørrelser.
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-4 py-2 xl:py-2.5 rounded-md text-sm xl:text-base font-medium whitespace-nowrap transition-colors ${isActive
      ? 'text-white border-b-2 border-white rounded-b-none'
      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
    }`;

  // Samme klasse, men uden bund-border-aktiv-stil (giver mere mening i en stacked mobil-liste)
  const getMobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium transition-colors ${isActive
      ? 'bg-slate-800 text-white'
      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
    }`;

  return (
    <header className="w-full bg-primary text-white border-b border-slate-800 shadow-md relative z-40">
      <div className="px-4 sm:px-6 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-5 flex items-center justify-between gap-2 min-h-[64px] lg:min-h-[90px]">
        {/* Logo -> Går til /dashboard */}
        <Link to="/dashboard" className="flex items-center gap-2 lg:gap-3 hover:opacity-90 transition-opacity shrink-0 min-w-0">
          <img src={logo} alt="PONOS Logo" className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 xl:w-16 xl:h-16 object-contain shrink-0" />
          <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-serif tracking-[0.1em] lg:tracking-[0.18em] xl:tracking-[0.25em] font-semibold text-slate-100 truncate">
            PONOS
          </span>
        </Link>

        {/* Desktop navigation: kompakt fra lg, fuld luft fra xl */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-2 min-w-0">
          <NavLink to="/dashboard" className={getNavLinkClass}>
            <LayoutDashboard className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/tasks" className={getNavLinkClass}>
            <ClipboardList className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
            <span>Opgaver</span>
          </NavLink>

          <NavLink to="/" className={getNavLinkClass}>
            <BarChart3 className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
            <span>Statistik</span>
          </NavLink>

          <NavLink to="/datalager" className={getNavLinkClass}>
            <Database className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
            <span>Datalager</span>
          </NavLink>

          {canManageMembershipRequests && (
            <NavLink to="/medlemsanmodninger" className={getNavLinkClass}>
              <UserPlus className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
              <span>Anmodninger</span>
            </NavLink>
          )}

          {canManageRoles && (
            <NavLink to="/roller" className={getNavLinkClass}>
              <ShieldCheck className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
              <span>Roller</span>
            </NavLink>
          )}
        </nav>

        {/* Højre side: Notifikation + Bruger Profil + mobil hamburger */}
        <div className="flex items-center gap-2 lg:gap-3 xl:gap-5 shrink-0">
          {/* Notifikationsikon -> Går til /notifikationer */}
          <Link
            to="/notifikationer"
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors"
            aria-label="Notifikationer"
          >
            <Bell className="w-5 h-5 xl:w-6 xl:h-6" />
            <span className="absolute top-1 right-1 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold" />
          </Link>

          {/* Bruger Profil -> åbner dropdown med "Se profil" og "Log ud" */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 xl:gap-3 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-semibold overflow-hidden shrink-0">
                {profile?.urlPicture ? (
                  <img src={profile.urlPicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 xl:w-6 xl:h-6 text-slate-700" />
                )}
              </div>
              <div className="hidden 2xl:flex flex-col text-left">
                <span className="text-sm font-semibold leading-tight">
                  {profile ? `${profile.firstName} ${profile.lastName}` : 'Bruger'}
                </span>
                <span className="text-xs text-slate-400">
                  {profile?.roleName ?? 'Ingen rolle'}
                </span>
              </div>
              <ChevronDown className={`hidden lg:block w-4 h-4 text-slate-300 transition-transform shrink-0 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg border border-border-gray py-1 z-50"
              >
                <Link
                  to="/bruger"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-bg-gray transition-colors"
                >
                  <User className="w-4 h-4" />
                  Se profil
                </Link>
                <Link
                  to="/organisation"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-bg-gray transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Organisation
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-bg-gray transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  {signingOut ? 'Logger ud...' : 'Log ud'}
                </button>
              </div>
            )}
          </div>

          {/* Hamburger-knap: kun synlig under lg, hvor nav'en er skjult */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Luk menu' : 'Åbn menu'}
            className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
          >
            {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobil navigation: dropper ned under headeren, kun under lg */}
      {mobileNavOpen && (
        <nav className="lg:hidden border-t border-slate-800 bg-primary px-4 py-3 space-y-1">
          <NavLink to="/dashboard" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/tasks" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
            <ClipboardList className="w-5 h-5 shrink-0" />
            <span>Opgaver</span>
          </NavLink>

          <NavLink to="/" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span>Statistik</span>
          </NavLink>

          <NavLink to="/datalager" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
            <Database className="w-5 h-5 shrink-0" />
            <span>Datalager</span>
          </NavLink>

          {canManageMembershipRequests && (
            <NavLink to="/medlemsanmodninger" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
              <UserPlus className="w-5 h-5 shrink-0" />
              <span>Anmodninger</span>
            </NavLink>
          )}

          {canManageRoles && (
            <NavLink to="/roller" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>Roller</span>
            </NavLink>
          )}
        </nav>
      )}
    </header>
  );
}