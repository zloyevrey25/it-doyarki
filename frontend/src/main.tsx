import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext'
import './styles.css'
import './workspace-layout.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppProvider><App /></AppProvider></React.StrictMode>)
