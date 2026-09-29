import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { Header } from './components/headerComponent';
import { Footer } from './components/footerComponent';
import { DataLayerPage } from './pages/dataLayer/DataLayerPage';
import SignUp from './pages/logIn/SignUp'
import Login from './pages/logIn/Login'
import ForgotPassword from './pages/logIn/ForgotPassword'
import ProtectedRoute from './routes/ProtectedRoute/ProtectedRoute'
import Dashboard from './pages/dashboard/Dashboard'
import PendingRequestBanner from './components/pendingRequestBanner/PendingRequestBanner';
import { TasksPage } from './pages/Task/TaskPage';
import { NewsPage } from './pages/News/NewsPage';
import { NewsDetailPage } from './pages/News/NewsDetailPage';
import ProfilePage from './pages/profile/ProfilePage';
import LandingPage from './pages/landing/LandingPage';
import StatisticsPage from './pages/statistik/StatisticsPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import HelpPage from './pages/public/HelpPage';
import NotFoundPage from './pages/public/NotFoundPage';
import { useGetSessionQuery } from './store/apis/authApi';
import { MessagesPage } from './pages/messages/messagePage';
import NotificationPage from './pages/notification/notificationPage';
import { MyTasksPage } from './pages/Task/MyTasksPage';
import { useOrganisationTheme } from './store/hooks/orgHook';
import { CompletedTasksPage } from './pages/Task/CompletedTasksPage';
import { TaskApprovalsPage } from './pages/Task/TaskApprovalsPage';

// Sider med kant-til-kant sektioner (navy bånd der flyder sammen med
// headeren) slipper ud af <main>'ens padding og holder
// selv deres indhold på plads med en egen max-w-7xl pr. sektion.
const FULL_WIDTH_ROUTES = ['/', '/om-os', '/kontakt', '/hjaelp'];

function App() {
  useOrganisationTheme();
  // Holder session-queryen aktiv hele appens levetid.
  // Den aktiverer authApi's onAuthStateChange-listener,
  // så login/logout slår igennem uden sideskift eller refresh.
  useGetSessionQuery();

  // Se FULL_WIDTH_ROUTES ovenfor. Alle andre ruter - inkl. 404-siden -
  // rammer den uændrede gren.
  const { pathname, hash } = useLocation();
  const isFullWidth = FULL_WIDTH_ROUTES.includes(pathname);
  const navigationType = useNavigationType();

  // Nyt sideskift starter i toppen. Undtagelser: hash-links (fx
  // /bruger#notification-settings scroller selv, se
  // NotificationSettingsSection.tsx) og tilbage/frem (POP), hvor
  // browseren selv genskaber positionen.
  useEffect(() => {
    if (hash || navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white dark:bg-slate-900">
      {/* HEADER */}
      <Header />
      {/* BANNER: Vises kun hvis brugeren har en Pending medlemsanmodning */}
      <PendingRequestBanner />
      {/* HOVEDINDHOLD / ROUTER */}
      <main className={isFullWidth ? 'flex-1 w-full text-black dark:text-slate-100' : 'flex-1 w-full p-3 sm:p-6 xl:px-8 text-black dark:text-slate-100'}>
        <Routes>
          {/* tilføj flere ruter efter behov */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          {/* US-68: glemt adgangskode - skal være offentlig, brugeren er
              per definition ikke logget ind */}
          <Route path="/glemt-adgangskode" element={<ForgotPassword />} />

          {/* Offentlige sider - tilgængelige både logget ind og ud */}
          <Route path="/om-os" element={<AboutPage />} />
          <Route path="/kontakt" element={<ContactPage />} />
          <Route path="/hjaelp" element={<HelpPage />} />

          {/* Alle ruter inde i denne wrapper kræver login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/mine" element={<MyTasksPage />} />
            <Route path="/tasks/afsluttede" element={<CompletedTasksPage />} />
            <Route path="/tasks/godkend" element={<TaskApprovalsPage />} />
            <Route path="/statistik" element={<StatisticsPage />} />
            <Route path="/bruger" element={<ProfilePage />} />
            <Route path="/datalager" element={<DataLayerPage />} />
            <Route path="/nyheder" element={<NewsPage />} />
            <Route path="/nyheder/:id" element={<NewsDetailPage />} />
            <Route path="/notifikationer" element={<NotificationPage />} />
            <Route path="/beskeder" element={<MessagesPage />} />

            {/* tilføj flere ruter efter behov */}
          </Route>

          {/* Ukendt URL - skal stå sidst, så den kun rammer det ingen andre tog */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default App;