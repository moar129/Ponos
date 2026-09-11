import { MapPin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo/PONOS_compass_1024x1024.png';
import { useGetSessionQuery } from '../store/apis/authApi';
import { useGetMyProfileQuery } from '../store/apis/profileApi';

export function Footer() {
  // Samme kilde som resten af appen (App.tsx holder denne aktiv, og den
  // opdateres øjeblikkeligt via onAuthStateChange ved login/logout).
  const { data: session, isLoading: isLoadingSession } = useGetSessionQuery();
  const isAuthenticated = !!session;

  // Samme org-gate som headeren - holdes bevidst identisk, så de to nav-
  // lister ikke driver fra hinanden igen. Genbruger headerens allerede
  // hentede profil-query (samme cache, ingen ekstra netværkskald).
  const { data: profile, isLoading: loadingProfile } = useGetMyProfileQuery();
  const hasOrganisation = !loadingProfile && !!profile?.activeOrganisationId;

  const linkClass =
    'hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline transition-colors';

  return (
    <footer className="w-full bg-primary text-slate-300 pt-8 pb-5 px-4 sm:px-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-6 mb-6">
        <div className="space-y-3">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 w-fit hover:opacity-90 transition-opacity">
            <img src={logo} alt="PONOS Logo" className="w-10 h-10 object-contain shrink-0" />
            <span className="text-xl font-serif tracking-[0.2em] font-semibold text-slate-100">
              PONOS
            </span>
          </Link>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Vi skaber overblik, samarbejde og bæredygtige resultater – sammen.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">Navigation</h3>

          {isLoadingSession ? (
            <ul className="space-y-2 text-xs text-slate-600 animate-pulse">
              <li className="h-3 w-16 bg-slate-800 rounded" />
              <li className="h-3 w-20 bg-slate-800 rounded" />
              <li className="h-3 w-14 bg-slate-800 rounded" />
            </ul>
          ) : isAuthenticated ? (
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/dashboard" className={linkClass}>Dashboard</Link></li>
              {hasOrganisation && (
                <>
                  <li><Link to="/tasks" className={linkClass}>Opgaver</Link></li>
                  <li><Link to="/statistik" className={linkClass}>Statistik</Link></li>
                  <li><Link to="/datalager" className={linkClass}>Datalager</Link></li>
                  <li><Link to="/nyheder" className={linkClass}>Nyheder</Link></li>
                </>
              )}
            </ul>
          ) : (
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/" className={linkClass}>Forside</Link></li>
              <li><Link to="/om-os" className={linkClass}>Om os</Link></li>
              <li><Link to="/kontakt" className={linkClass}>Kontakt</Link></li>
              <li><Link to="/hjaelp" className={linkClass}>Hjælp &amp; support</Link></li>
              <li><Link to="/login" className={linkClass}>Login</Link></li>
            </ul>
          )}
        </nav>

        <div>
          <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">Kontakt</h3>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Roskilde, Danmark</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <a href="mailto:info@ponos.dk" className={linkClass}>
                info@ponos.dk
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800/60 pt-4 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} Ponos. Alle rettigheder forbeholdes.
      </div>
    </footer>
  );
}