import { Route, Routes } from 'react-router-dom'
import { Header } from './components/headerComponent'
import { Footer } from './components/footerComponent'
import SignUp from './pages/logIn/SignUp'
import Login from './pages/logIn/Login'
import { useAuthListener } from './store/hooks/useAuthListener'
import ProtectedRoute from './routes/ProtectedRoute/ProtectedRoute'
import Dashboard from './pages/dashboard/Dashboard'


function App() {
  // Denne hook sørger for, at Redux-store'ets auth-state altid matcher Supabases faktiske login-status.
  useAuthListener()

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F3F4F8]">
      {/* HEADER */}
      <Header />

      {/* HOVEDINDHOLD */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <Routes>
          {/* tilføj flere ruter efter behov */}
          <Route path="/" element={<div />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />

          {/* Alle ruter inde i denne wrapper kræver login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* tilføj flere ruter efter behov */}
          </Route>
        </Routes>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}

export default App