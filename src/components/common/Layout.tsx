import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">Just Ask</h1>
          <nav className="nav">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Survey
            </Link>
            <Link 
              to="/select" 
              className={`nav-link ${location.pathname === '/select' ? 'active' : ''}`}
            >
              Survey Selector
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
      <footer className="footer">
        <p>&copy; 2025 Just Ask Survey Platform</p>
      </footer>
    </div>
  )
}

export default Layout