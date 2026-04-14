import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import DataBook from './DataBook';
import Viewer from './Viewer';
import { Database, MonitorPlay } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  
  return (
    <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-center space-x-4">
      <Link 
        to="/" 
        className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors ${
          location.pathname === '/' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        <Database className="w-5 h-5 mr-2" /> 데이터 수집기
      </Link>
      <Link 
        to="/viewer" 
        className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors ${
          location.pathname === '/viewer' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        <MonitorPlay className="w-5 h-5 mr-2" /> 데이터북 뷰어
      </Link>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 font-sans">
        <Navigation />
        <Routes>
          <Route path="/" element={<DataBook />} />
          <Route path="/viewer" element={<Viewer />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
