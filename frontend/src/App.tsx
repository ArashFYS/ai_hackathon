import { NavLink, Route, Routes } from 'react-router-dom'
import Zoeken from './pages/Zoeken'
import Detail from './pages/Detail'
import Straat from './pages/Straat'
import Goedgekeurd from './pages/Goedgekeurd'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'site-nav-link is-active' : 'site-nav-link'

export default function App() {
  return (
    <div className="antwerp-app">
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="site-brand">
            <img src="/provincie-antwerpen-logo.svg" width="170" height="52" alt="Provincie Antwerpen" />
            <span>Find the real<br />businesses</span>
          </NavLink>
          <nav className="site-nav" aria-label="Main navigation">
            <NavLink to="/" end className={navCls}>Search</NavLink>
            <NavLink to="/straat" className={navCls}>Street overview</NavLink>
            <NavLink to="/goedgekeurd" className={navCls}>Approved changes</NavLink>
          </nav>
        </div>
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Zoeken />} />
          <Route path="/record/:nr" element={<Detail />} />
          <Route path="/straat" element={<Straat />} />
          <Route path="/straat/:street" element={<Straat />} />
          <Route path="/goedgekeurd" element={<Goedgekeurd />} />
          <Route path="*" element={<p className="text-gray-600">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>
          Source: public KBO data, enriched with the Flemish Address Register (VKBO, Digitaal Vlaanderen).
        </p>
        <span>Local UI concept · hackathon</span>
      </footer>
    </div>
  )
}
