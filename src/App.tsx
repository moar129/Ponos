import { Routes, Route } from 'react-router-dom';
import { Header } from './components/headerComponent';
import { Footer } from './components/footerComponent';
import { DataLayerPage } from './pages/dataLayer/DataLayerPage';
import SignUp from './pages/logIn/SignUp'

function App() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-100">
      {/* HEADER */}
      <Header />

      {/* HOVEDINDHOLD / ROUTER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <Routes>
          {/* Forsiden */}
          <Route
            path="/"
            element={
              <div className="flex items-center justify-center h-64 text-slate-400">
                Velkommen til PONOS
              </div>
            }
          />

          {/* Datalager siden */}
          <Route path="/datalager" element={<DataLayerPage />} />
        </Routes>
        <SignUp />
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default App;