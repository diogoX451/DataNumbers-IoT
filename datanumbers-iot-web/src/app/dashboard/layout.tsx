"use client";

import { useEffect, useState } from "react";
import NavbarVertical from "./components/NavbarVertical";
import { Bell, Search } from "lucide-react";
import useGetAxios from "../../server/GetAxios";
import { User as UserInterface } from "../../interfaces/User";

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState<UserInterface | null>(null);
  const { data, error, loaded } = useGetAxios<any>("/api/auth/user/find-user", true);

  useEffect(() => {
    if (loaded && !error && data) {
      setUser(data?.data as UserInterface);
    }
  }, [data, loaded, error]);

  const initials = user?.Name 
    ? user.Name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : "DA";

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">
      <NavbarVertical />
      
      <main className="flex-1 transition-all duration-300 ml-64 flex flex-col">
        {/* Top Header Bar - From Image */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40 w-full">
          <div className="relative w-[500px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Buscar dispositivos..." 
              className="w-full bg-[#f8fafc] border-transparent rounded-xl py-3 pl-12 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all outline-none border"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all relative">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#6d5dfc] rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-4 pl-4 group cursor-pointer border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-extrabold text-slate-700 leading-none group-hover:text-[#6d5dfc] transition-colors">
                    {user?.Name || "Diogo Almeida"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                    {user?.Username || "DIOGO"}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#6d5dfc] rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-xl shadow-indigo-200 ring-4 ring-white ring-offset-0">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
