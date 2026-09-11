import { Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/headerComponent';
import { Footer } from './components/footerComponent';
import { DataLayerPage } from './pages/dataLayer/DataLayerPage';
import SignUp from './pages/logIn/SignUp'
import Login from './pages/logIn/Login'
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

// Sider med kant-til-kant sektioner (navy bånd der flyder sammen med
// headeren) slipper ud af <main>'ens fælles max-w-7xl-wrapper og holder
// selv deres indhold på plads med en egen max-w-7xl pr. sektion.
const FULL_WIDTH_ROUTES = ['/', '/om-os', '/kontakt', '/hjaelp'];

function App() {
  // Holder session-queryen aktiv hele appens levetid.
  // Den aktiverer authApi's onAuthStateChange-listener,
  // så login/logout slår igennem uden sideskift eller refresh.
  useGetSessionQuery();

  // Se FULL_WIDTH_ROUTES ovenfor. Alle andre ruter - inkl. 404-siden -
  // rammer den uændrede gren.
  const { pathname } = useLocation();
  const isFullWidth = FULL_WIDTH_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-100">
      {/* HEADER */}
      <Header />
      {/* BANNER: Vises kun hvis brugeren har en Pending medlemsanmodning */}
      <PendingRequestBanner />
      {/* HOVEDINDHOLD / ROUTER */}
      <main className={isFullWidth ? 'flex-1 w-full text-black' : 'flex-1 max-w-7xl w-full mx-auto p-6 text-black'}>
        <Routes>
          {/* tilføj flere ruter efter behov */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />

          {/* Offentlige sider - tilgængelige både logget ind og ud */}
          <Route path="/om-os" element={<AboutPage />} />
          <Route path="/kontakt" element={<ContactPage />} />
          <Route path="/hjaelp" element={<HelpPage />} />

          {/* Alle ruter inde i denne wrapper kræver login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/statistik" element={<StatisticsPage />} />
            <Route path="/bruger" element={<ProfilePage />} />
            <Route path="/datalager" element={<DataLayerPage />} />
            <Route path="/nyheder" element={<NewsPage />} />
            <Route path="/nyheder/:id" element={<NewsDetailPage />} />
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