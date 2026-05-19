import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {

  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNotificationClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen flex bg-slate-100 overflow-hidden">

      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR DESKTOP */}
      <div className="hidden lg:flex lg:w-[290px] lg:min-w-[290px] flex-shrink-0">
        <Sidebar />
      </div>

      {/* SIDEBAR MOBILE */}
      <div
        className={`
          fixed top-0 left-0 z-50 h-full transform transition-transform duration-300 lg:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar mobile onClose={() => setSidebarOpen(false)} />
      </div>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* TOPBAR */}
        <Topbar
          onNotificationClick={handleNotificationClick}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          <div className="bg-white rounded-3xl min-h-full shadow-sm p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>

        </div>

      </main>

    </div>
  );
}