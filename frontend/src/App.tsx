import { NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import Zoeken from './pages/Zoeken'
import Dashboard from './pages/Dashboard'
import Detail from './pages/Detail'
import Straat from './pages/Straat'
import Goedgekeurd from './pages/Goedgekeurd'
import Kaart from './pages/Kaart'
import LanguageToggle from './components/LanguageToggle'
import { useT } from './i18n'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'site-nav-link is-active' : 'site-nav-link'

function Home() {
  const [params] = useSearchParams()
  return ['q', 'type', 'status', 'activity', 'street'].some((key) => params.has(key))
    ? <Navigate to={`/zoeken?${params}`} replace /> : <Dashboard />
}

export default function App() {
  const t = useT()
  const location = useLocation()
  return (
    <div className={`antwerp-app ${location.pathname === '/' ? 'has-dashboard' : ''}`}>
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="site-brand">
            <img src="/provincie-antwerpen-logo.svg" width="170" height="52" alt="Provincie Antwerpen" />
            <span>{t('app.title')}</span>
          </NavLink>
          <nav className="site-nav" aria-label={t('dashboard.navigation')}>
            <NavLink to="/" end className={navCls}>{t('dashboard.nav')}</NavLink>
            <NavLink to="/zoeken" className={navCls}>{t('nav.search')}</NavLink>
            <NavLink to="/straat" className={navCls}>{t('nav.street')}</NavLink>
            <NavLink to="/kaart" className={navCls}>{t('nav.map')}</NavLink>
            <NavLink to="/goedgekeurd" className={navCls}>{t('nav.approved')}</NavLink>
          </nav>
          <div className="ml-auto"><LanguageToggle /></div>
        </div>
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/zoeken" element={<Zoeken />} />
          <Route path="/record/:nr" element={<Detail />} />
          <Route path="/straat" element={<Straat />} />
          <Route path="/straat/:street" element={<Straat />} />
          <Route path="/kaart" element={<Kaart />} />
          <Route path="/goedgekeurd" element={<Goedgekeurd />} />
          <Route path="*" element={<p className="text-gray-600">{t('app.notFound')}</p>} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>{t('app.footer')}</p>
      </footer>
    </div>
  )
}
