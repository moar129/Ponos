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
import { useGetSessionQuery } from './store/apis/authApi';

function App() {
  // Holder session-queryen aktiv hele appens levetid.
  // Den aktiverer authApi's onAuthStateChange-listener,
  // så login/logout slår igennem uden sideskift eller refresh.
  useGetSessionQuery();

  // Forsiden er den eneste side med kant-til-kant sektioner (navy hero der
  // flyder sammen med headeren), så den slipper ud af <main>'ens fælles
  // max-w-7xl-wrapper og styrer selv sine bredder. Alle andre ruter rammer
  // den uændrede gren.
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-100">
      {/* HEADER */}
      <Header />
      {/* BANNER: Vises kun hvis brugeren har en Pending medlemsanmodning */}
      <PendingRequestBanner />
      {/* HOVEDINDHOLD / ROUTER */}
      <main className={isLanding ? 'flex-1 w-full text-black' : 'flex-1 max-w-7xl w-full mx-auto p-6 text-black'}>
        <Routes>
          {/* tilføj flere ruter efter behov */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />

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
        </Routes>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default App;