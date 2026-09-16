import { NavLink, Route, Routes } from 'react-router-dom'
import Zoeken from './pages/Zoeken'
import Detail from './pages/Detail'
import Straat from './pages/Straat'
import Goedgekeurd from './pages/Goedgekeurd'
import Kaart from './pages/Kaart'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <NavLink to="/" className="text-lg font-semibold">
            Vind de echte ondernemingen
          </NavLink>
          <nav className="flex gap-4 text-sm">
            <NavLink to="/" end className={navCls}>Zoeken</NavLink>
            <NavLink to="/straat" className={navCls}>Straatoverzicht</NavLink>
            <NavLink to="/kaart" className={navCls}>Kaart</NavLink>
            <NavLink to="/goedgekeurd" className={navCls}>Goedgekeurde wijzigingen</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Zoeken />} />
          <Route path="/record/:nr" element={<Detail />} />
          <Route path="/straat" element={<Straat />} />
          <Route path="/straat/:street" element={<Straat />} />
          <Route path="/kaart" element={<Kaart />} />
          <Route path="/goedgekeurd" element={<Goedgekeurd />} />
          <Route path="*" element={<p className="text-gray-600">Pagina niet gevonden.</p>} />
        </Routes>
      </main>
      <footer className="border-t bg-white">
        <p className="mx-auto max-w-7xl px-4 py-3 text-xs text-gray-500">
          Bron: publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister (VKBO, Digitaal Vlaanderen).
        </p>
      </footer>
    </div>
  )
}
