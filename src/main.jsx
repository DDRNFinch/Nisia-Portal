import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const cards = [
  { title: 'Reviews', detail: '3 test reviews due', accent: 'blue' },
  { title: 'Evidence', detail: '8 test items waiting', accent: 'yellow' },
  { title: 'Progress', detail: 'View learner progress', accent: 'teal' },
  { title: 'Courses', detail: '4 test courses', accent: 'coral' },
]

function NisiaMark() {
  return (
    <div className="brand" aria-label="Nisia">
      <div className="wordmark">
        <span>N</span>
        <span className="brand-i brand-yellow">i</span>
        <span>s</span>
        <span className="brand-i brand-blue">i</span>
        <span>a</span>
      </div>
      <div className="brand-dots" aria-hidden="true">
        <span className="brand-dot brand-coral" />
        <span className="brand-dot brand-teal" />
      </div>
    </div>
  )
}

function App() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <NisiaMark />
        <button className="profile-button" type="button" aria-label="Profile">
          <span className="profile-dot" />
        </button>
      </header>

      <section className="content">
        <div className="intro-row">
          <div>
            <p className="eyebrow">Development preview</p>
            <h1>Good morning</h1>
            <p className="subtle">Fake data only while Nisia is being built.</p>
          </div>
          <div className="accent-dots" aria-hidden="true">
            <span className="dot yellow" />
            <span className="dot blue" />
            <span className="dot coral" />
            <span className="dot teal" />
          </div>
        </div>

        <button className="hero-card" type="button">
          <div>
            <span className="card-kicker">Learners</span>
            <strong>12 test learners</strong>
            <span className="card-detail">Open learner overview</span>
          </div>
          <span className="arrow" aria-hidden="true">→</span>
        </button>

        <div className="card-grid">
          {cards.map((card) => (
            <button className={`small-card ${card.accent}`} type="button" key={card.title}>
              <span className="small-card-title">{card.title}</span>
              <span className="small-card-detail">{card.detail}</span>
              <span className="mini-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
