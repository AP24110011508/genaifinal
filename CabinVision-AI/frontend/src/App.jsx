import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Workspace from './pages/Workspace';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Scroll to top when switching between Home and Studio Workspace
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#0c0d11] text-[#ede8df] flex flex-col selection:bg-[#c98a4b] selection:text-white">
      {/* Sticky Glassmorphic Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === 'home' ? (
          <Home onNavigateWorkspace={() => setActiveTab('workspace')} />
        ) : (
          <Workspace onNavigateHome={() => setActiveTab('home')} />
        )}
      </main>
    </div>
  );
}

export default App;
