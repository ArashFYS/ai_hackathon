import { NavLink, Route, Routes } from 'react-router-dom'
import Zoeken from './pages/Zoeken'
import Detail from './pages/Detail'
import Straat from './pages/Straat'
import Goedgekeurd from './pages/Goedgekeurd'
import Kaart from './pages/Kaart'
import LanguageToggle from './components/LanguageToggle'
import { useT } from './i18n'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'site-nav-link is-active' : 'site-nav-link'

export default function App() {
  const t = useT()
  return (
    <div className="antwerp-app">
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="site-brand">
            <img src="/provincie-antwerpen-logo.svg" width="170" height="52" alt="Provincie Antwerpen" />
            <span>{t('app.title')}</span>
          </NavLink>
          <nav className="site-nav" aria-label="Main navigation">
            <NavLink to="/" end className={navCls}>{t('nav.search')}</NavLink>
            <NavLink to="/straat" className={navCls}>{t('nav.street')}</NavLink>
            <NavLink to="/kaart" className={navCls}>{t('nav.map')}</NavLink>
            <NavLink to="/goedgekeurd" className={navCls}>{t('nav.approved')}</NavLink>
          </nav>
          <div className="ml-auto"><LanguageToggle /></div>
        </div>
      </header>
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Zoeken />} />
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
