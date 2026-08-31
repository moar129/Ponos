import { Header } from './components/headerComponent'
import { Footer } from './components/footerComponent'
import SignUp from './pages/logIn/SignUp'

function App() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F3F4F8]">
      {/* HEADER */}
      <Header />

      {/* HOVEDINDHOLD */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <SignUp />
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}

export default App