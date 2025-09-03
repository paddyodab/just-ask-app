import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 
            className="logo" 
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            Just Ask!
          </h1>
          <nav className="nav">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Survey Selector
            </Link>
            <Link 
              to="/survey" 
              className={`nav-link ${location.pathname === '/survey' ? 'active' : ''}`}
            >
              Take Survey
            </Link>
            <Link 
              to="/admin" 
              className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
      <footer className="footer">
        <p>&copy; 2025 Just Ask! Survey Platform</p>
      </footer>
    </div>
  )
}

export default Layout