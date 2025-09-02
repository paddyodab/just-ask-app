# Employee Pulse Survey Setup Guide

## Overview
This folder contains all the assets needed to set up an Employee Pulse Survey for TechFlow company.

## Contents

### 📁 lookups/
- **departments.csv** - Company departments (Engineering, Sales, Marketing, etc.)
- **locations.csv** - Office locations (HQ-SF, NY, Chicago, Austin, London, Remote, etc.)
- **tenure.csv** - Employee tenure ranges (Less than 6 months to More than 10 years)
- **employment_type.csv** - Employment types (Full-time, Part-time, Contractor, Intern)

### 🎨 assets/
- **techflow-logo.svg** - TechFlow company logo with gradient design
- **techflow-brand.css** - Custom branding with blue gradient theme

### 📋 Survey Template
- **employee-pulse-survey-TEMPLATE.json** - Survey configuration (needs lookup URLs)

## Setup Steps

### 1. Create Customer & Namespace
1. Go to Admin Dashboard → Customers
2. Create new customer: **"Demo Customer"**
3. Go to Namespaces
4. Create namespace: **"employee-pulse-20250901"** (or similar)

### 2. Upload Lookup Data
1. Go to Admin → Lookup Data
2. Select Demo Customer and employee-pulse namespace
3. Upload each CSV file from the `lookups/` folder:
   - departments.csv
   - locations.csv  
   - tenure.csv
   - employment_type.csv
4. **Copy the lookup URLs** for each uploaded file

### 3. Upload Assets
1. Go to Admin → Assets
2. Select Demo Customer and employee-pulse namespace
3. Upload from `assets/` folder:
   - techflow-logo.svg
   - techflow-brand.css

### 4. Update Survey JSON
1. Open `employee-pulse-survey-TEMPLATE.json`
2. Replace the placeholder URLs:
   - `REPLACE_WITH_DEPARTMENTS_LOOKUP_URL` → actual departments lookup URL
   - `REPLACE_WITH_LOCATIONS_LOOKUP_URL` → actual locations lookup URL
   - `REPLACE_WITH_TENURE_LOOKUP_URL` → actual tenure lookup URL
   - `REPLACE_WITH_EMPLOYMENT_TYPE_LOOKUP_URL` → actual employment_type lookup URL
3. Save as `employee-pulse-survey.json`

### 5. Upload Survey
1. Go to Admin → Surveys
2. Select Demo Customer and employee-pulse namespace
3. Upload the updated `employee-pulse-survey.json`
4. Test the survey!

## Survey Features

### 📊 Survey Structure
- **5 Pages**: Demographics, Job Satisfaction, Company Culture, Management & Leadership, Looking Forward
- **Mixed Question Types**: Dropdowns (with lookups), Ratings, Matrix, Radio groups, Boolean, Comments
- **Progress Bar**: Shows question-by-question progress
- **Custom Branding**: TechFlow blue gradient theme

### 🎯 Key Metrics Collected
- Department and location demographics
- Employee tenure and type
- Overall job satisfaction (1-10 scale)
- Work-life balance rating
- Career development satisfaction
- Culture alignment (5-point Likert scale)
- Manager support rating
- Leadership trust
- Employee Net Promoter Score (recommendation)
- Retention outlook
- Open feedback

### 🎨 Branding
- **Colors**: Blue gradient (#00d4ff → #0066ff → #6610f2)
- **Font**: Inter for body, Space Grotesk for headers
- **Style**: Modern tech company aesthetic with smooth animations

## Testing
After setup, the survey should display:
- TechFlow logo at the top
- Custom blue gradient theme
- Dynamic dropdowns populated from lookup data
- Smooth animations and hover effects
- Professional completion page

## Notes
- All responses are anonymous
- The survey takes approximately 5-7 minutes to complete
- Lookup data can be updated anytime through the admin panel
- CSS can be modified to match different branding needs