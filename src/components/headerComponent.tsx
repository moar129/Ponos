import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Database,
  Newspaper,
  Bell,
  User,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import logo from '../assets/logo/PONOS_compass_1024x1024.png';
import { useGetMyProfileQuery } from '../store/apis/profileApi';
import { useGetSessionQuery, useSignOutMutation } from '../store/apis/authApi';

export function Header() {
  const navigate = useNavigate();

  // Samme session-kilde som resten af appen (App.tsx holder queryen aktiv,
  // og authApi's onAuthStateChange opdaterer cachen), så headeren skifter
  // med det samme ved login/logout uden reload.
  const { data: session, isLoading: isLoadingSession } = useGetSessionQuery();
  const isAuthenticated = !!session;

  // Viser den indloggede brugers eget navn/rolle i stedet for pladsholder-
  // tekst. Er ingen logget ind (eller profilen endnu ikke hentet), falder
  // vi tilbage til en neutral tekst.
  const { data: profile, isLoading: loadingProfile } = useGetMyProfileQuery();
  const [signOut, { isLoading: signingOut }] = useSignOutMutation();

  // Opgaver/Statistik/Datalager/Nyheder giver kun mening med en aktiv
  // organisation (US-45/US-56). Genbruger activeOrganisationId fra profilen
  // ovenfor i stedet for et selvstændigt organisations-opslag - samme ja/nej-
  // svar uden et ekstra kald på hver side. Skjuler indtil profilen er hentet,
  // så en bruger uden organisation aldrig ser links, der ikke virker for dem.
  const hasOrganisation = !loadingProfile && !!profile?.activeOrganisationId;

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
        {/* Logo -> /dashboard når man er logget ind, ellers forsiden (en
            udlogget bruger ville ellers bare blive redirigeret til /login) */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 lg:gap-3 hover:opacity-90 transition-opacity shrink-0 min-w-0">
          <img src={logo} alt="PONOS Logo" className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 xl:w-16 xl:h-16 object-contain shrink-0" />
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-serif tracking-[0.1em] lg:tracking-[0.18em] xl:tracking-[0.25em] font-semibold text-slate-100">
              PONOS
            </span>
            {profile?.organisationName && (
              <span className="hidden sm:inline text-sm lg:text-base font-medium tracking-normal text-slate-300 truncate">
                – {profile.organisationName}
              </span>
            )}
          </span>
        </Link>

        {/* Desktop navigation: kompakt fra lg, fuld luft fra xl.
            Kræver login - en udlogget bruger har ingen sider at gå til. */}
        {isAuthenticated && (
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-2 min-w-0">
            <NavLink to="/dashboard" className={getNavLinkClass}>
              <LayoutDashboard className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
              <span>Dashboard</span>
            </NavLink>

            {hasOrganisation && (
              <>
                <NavLink to="/tasks" className={getNavLinkClass}>
                  <ClipboardList className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
                  <span>Opgaver</span>
                </NavLink>

                <NavLink to="/statistik" className={getNavLinkClass}>
                  <BarChart3 className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
                  <span>Statistik</span>
                </NavLink>

                <NavLink to="/datalager" className={getNavLinkClass}>
                  <Database className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
                  <span>Datalager</span>
                </NavLink>

                <NavLink to="/nyheder" className={getNavLinkClass}>
                  <Newspaper className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
                  <span>Nyheder</span>
                </NavLink>
              </>
            )}
          </nav>
        )}

        {/* Højre side: Notifikation + Bruger Profil + mobil hamburger, eller
            "Log ind" når man ikke er logget ind. Mens sessionen endnu hentes
            vises ingen af delene, så "Log ind" ikke blinker forbi for en
            bruger der faktisk er logget ind. */}
        <div className="flex items-center gap-2 lg:gap-3 xl:gap-5 shrink-0">
          {isAuthenticated ? (
            <>
              {/* Notifikationer er endnu ikke bygget (ingen tabel, ingen rute,
                  ingen user story) - ikonet bliver stående som en deaktiveret
                  knap i stedet for et link til en side der ikke findes. */}
              <button
                type="button"
                disabled
                aria-label="Notifikationer (kommer snart)"
                title="Kommer snart"
                className="relative p-2 text-slate-500 rounded-full cursor-not-allowed"
              >
                <Bell className="w-5 h-5 xl:w-6 xl:h-6" />
              </button>

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
            </>
          ) : (
            !isLoadingSession && (
              <>
                {/* Forside-linket hører kun til den udloggede tilstand - er
                    man logget ind, hører man hjemme på dashboardet, og "/"
                    redirecter derhen alligevel. Ligger her frem for i
                    <nav>'en, som er hidden under lg: hamburgeren er også
                    skjult for udloggede, så linket ville forsvinde på mobil. */}
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  Forside
                </NavLink>
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                  Log ind
                </Link>
              </>
            )
          )}
        </div>
      </div>

      {/* Mobil navigation: dropper ned under headeren, kun under lg */}
      {isAuthenticated && mobileNavOpen && (
        <nav className="lg:hidden border-t border-slate-800 bg-primary px-4 py-3 space-y-1">
          <NavLink to="/dashboard" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          {hasOrganisation && (
            <>
              <NavLink to="/tasks" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
                <ClipboardList className="w-5 h-5 shrink-0" />
                <span>Opgaver</span>
              </NavLink>

              <NavLink to="/statistik" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
                <BarChart3 className="w-5 h-5 shrink-0" />
                <span>Statistik</span>
              </NavLink>

              <NavLink to="/datalager" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
                <Database className="w-5 h-5 shrink-0" />
                <span>Datalager</span>
              </NavLink>

              <NavLink to="/nyheder" className={getMobileNavLinkClass} onClick={() => setMobileNavOpen(false)}>
                <Newspaper className="w-5 h-5 shrink-0" />
                <span>Nyheder</span>
              </NavLink>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
