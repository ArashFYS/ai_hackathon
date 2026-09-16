import { Link, Route, Routes } from 'react-router-dom'

function Home() {
  return (
    <p className="text-gray-600">
      Zoek een onderneming of vestiging om de registergegevens en het bewijs van activiteit te bekijken.
    </p>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            Vind de echte ondernemingen
          </Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link to="/">Zoeken</Link>
            <Link to="/straat">Straatoverzicht</Link>
            <Link to="/goedgekeurd">Goedgekeurde wijzigingen</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}
