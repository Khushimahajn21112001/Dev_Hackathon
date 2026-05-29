import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';

const SupportLayout = () => {
  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SupportLayout;
