import React, { useState } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import CustomerManagement from '../components/Admin/CustomerManagement'
import NamespaceManagement from '../components/Admin/NamespaceManagement'
import LookupManagement from '../components/Admin/LookupManagement'
import AssetManagement from '../components/Admin/AssetManagement'
import SurveyManagement from '../components/Admin/SurveyManagement'
import ResponseManagement from '../components/Admin/ResponseManagement'
import './AdminPage.css'

const AdminPage: React.FC = () => {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p className="admin-description">Manage customers, namespaces, lookups, assets, surveys, and responses</p>
        </div>

        <nav className="admin-nav">
          <Link 
            to="/admin/customers" 
            className={`admin-nav-link ${currentPath.includes('/admin/customers') ? 'active' : ''}`}
          >
            <span className="nav-icon">👥</span>
            Customers
          </Link>
          <Link 
            to="/admin/namespaces" 
            className={`admin-nav-link ${currentPath.includes('/admin/namespaces') ? 'active' : ''}`}
          >
            <span className="nav-icon">📁</span>
            Namespaces
          </Link>
          <Link 
            to="/admin/lookups" 
            className={`admin-nav-link ${currentPath.includes('/admin/lookups') ? 'active' : ''}`}
          >
            <span className="nav-icon">📊</span>
            Lookup Data
          </Link>
          <Link 
            to="/admin/assets" 
            className={`admin-nav-link ${currentPath.includes('/admin/assets') ? 'active' : ''}`}
          >
            <span className="nav-icon">🎨</span>
            Assets
          </Link>
          <Link 
            to="/admin/surveys" 
            className={`admin-nav-link ${currentPath.includes('/admin/surveys') ? 'active' : ''}`}
          >
            <span className="nav-icon">📝</span>
            Surveys
          </Link>
          <Link 
            to="/admin/responses" 
            className={`admin-nav-link ${currentPath.includes('/admin/responses') ? 'active' : ''}`}
          >
            <span className="nav-icon">📊</span>
            View Responses
          </Link>
        </nav>

        <div className="admin-content">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/customers" replace />} />
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/namespaces" element={<NamespaceManagement />} />
            <Route path="/lookups" element={<LookupManagement />} />
            <Route path="/assets" element={<AssetManagement />} />
            <Route path="/surveys" element={<SurveyManagement />} />
            <Route path="/responses" element={<ResponseManagement />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default AdminPage