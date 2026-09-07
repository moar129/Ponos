import { Route, Routes } from 'react-router-dom'
import { Header } from './components/headerComponent';
import { Footer } from './components/footerComponent';
import { DataLayerPage } from './pages/dataLayer/DataLayerPage';
import SignUp from './pages/logIn/SignUp'
import Login from './pages/logIn/Login'
import ProtectedRoute from './routes/ProtectedRoute/ProtectedRoute'
import Dashboard from './pages/dashboard/Dashboard'
import RequestMembership from './pages/organisation/RequestMembership';
import MembershipRequestsPage from './pages/organisation/MembershipRequestsPage';
import PendingRequestBanner from './components/pendingRequestBanner/PendingRequestBanner';
import { TasksPage } from './pages/Task/TaskPage';
import ProfilePage from './pages/profile/ProfilePage';
import { useGetSessionQuery } from './store/apis/authApi';

function App() {
  // Holder session-queryen abonneret hele appens levetid. Den er det, der
  // starter authApi's onAuthStateChange-listener - uden en abonnent her
  // kørte listeneren ikke på /login, så login/logout først slog igennem
  // i headeren efter et sideskift eller en refresh.
  useGetSessionQuery();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-100">
      {/* HEADER */}
      <Header />
      {/* BANNER: Vises kun hvis brugeren har en Pending medlemsanmodning */}
      <PendingRequestBanner />
      {/* HOVEDINDHOLD / ROUTER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 text-black">
        <Routes>
          {/* tilføj flere ruter efter behov */}
          <Route path="/" element={<div />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />

          {/* Alle ruter inde i denne wrapper kræver login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/request-membership" element={<RequestMembership />} />
            <Route path="/medlemsanmodninger" element={<MembershipRequestsPage />} />
            <Route path="/bruger" element={<ProfilePage />} />
            <Route path="/datalager" element={<DataLayerPage />} />
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