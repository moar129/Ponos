import { MapPin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo/PONOS_compass_1024x1024.png';
import { useGetSessionQuery } from '../store/apis/authApi';
import { useGetMyProfileQuery } from '../store/apis/profileApi';
import { CONTACT_EMAIL, CONTACT_LOCATION } from '../lib/contact';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation('nav');
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
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 mb-6">
        <div className="space-y-3 min-w-0">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 w-fit hover:opacity-90 transition-opacity">
            <img src={logo} alt="PONOS Logo" className="w-10 h-10 object-contain shrink-0" />
            <span className="text-xl font-serif tracking-[0.2em] font-semibold text-slate-100">
              PONOS
            </span>
          </Link>
          <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
            {t('footer.tagline')}
          </p>
        </div>

        {/* De to link-lister deler ét felt i footerens grid og står derfor
            tæt på hinanden, i stedet for at blive skubbet fra hinanden af
            fjerdedelsbredder. De er stadig to selvstændige lister: Navigation
            er appens egne sider og skifter med login-tilstanden, mens "Om
            Ponos" handler om produktet og er ens for alle. På mobil stables
            de under hinanden på de mindste skærme (grid-cols-1) og fra sm
            igen som to smalle halvdele, ligesom resten af footeren. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-6">
          <nav aria-label={t("footer.navigationLabel")}>
            <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">{t('footer.navigation')}</h3>

            {isLoadingSession ? (
              <ul className="space-y-2 text-xs text-slate-500 animate-pulse">
                <li className="h-3 w-16 bg-slate-800 rounded" />
                <li className="h-3 w-20 bg-slate-800 rounded" />
                <li className="h-3 w-14 bg-slate-800 rounded" />
              </ul>
            ) : isAuthenticated ? (
              <ul className="space-y-2 text-xs text-slate-300">
                <li><Link to="/dashboard" className={linkClass}>{t('links.dashboard')}</Link></li>
                {hasOrganisation && (
                  <>
                    <li><Link to="/tasks" className={linkClass}>{t('links.tasks')}</Link></li>
                    <li><Link to="/statistik" className={linkClass}>{t('links.statistics')}</Link></li>
                    <li><Link to="/datalager" className={linkClass}>{t('links.datalayer')}</Link></li>
                    <li><Link to="/nyheder" className={linkClass}>{t('links.news')}</Link></li>
                    <li><Link to="/beskeder" className={linkClass}>{t('links.messages')}</Link></li>
                  </>
                )}
              </ul>
            ) : (
              <ul className="space-y-2 text-xs text-slate-300">
                <li><Link to="/" className={linkClass}>{t('links.home')}</Link></li>
                <li><Link to="/login" className={linkClass}>{t('links.login')}</Link></li>
              </ul>
            )}
          </nav>

          {/* Ingen login-gate her: de tre sider er de samme uanset tilstand. */}
          <nav aria-label={t("footer.aboutLabel")}>
            <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">{t('footer.aboutHeading')}</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li><Link to="/om-os" className={linkClass}>{t('footer.about')}</Link></li>
              <li><Link to="/kontakt" className={linkClass}>{t('footer.contact')}</Link></li>
              <li><Link to="/hjaelp" className={linkClass}>{t('footer.help')}</Link></li>
            </ul>
          </nav>
        </div>

        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">{t('footer.contact')}</h3>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="truncate">{CONTACT_LOCATION}</span>
            </li>
            <li className="flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 text-slate-300 shrink-0" />
              <a href={`mailto:${CONTACT_EMAIL}`} className={`${linkClass} truncate`}>
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800/60 pt-4 text-center text-[11px] text-slate-400">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}