
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/headerComponent';
import { Footer } from './components/footerComponent';
import { DataLayerPage } from './pages/dataLayer/DataLayerPage';
import SignUp from './pages/logIn/SignUp'
import { TasksPage } from './pages/Task/TasksPage';

function App() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-100">
      {/* HEADER */}
      <Header />

      {/* HOVEDINDHOLD / ROUTER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 text-black">
        <Routes>
          {/* Forsiden */}
          <Route
            path="/"
            element={
              <>
                <div className="flex items-center justify-center h-20 text-slate-400 font-bold">
                  Velkommen til PONOS
                </div>
                <SignUp />
              </>
            }
          />
         
          {/* Opgaver siden */}
          <Route path="/tasks" element={<TasksPage />} />

          {/* Datalager siden */}
          <Route path="/datalager" element={<DataLayerPage />} />
        </Routes>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default App;
