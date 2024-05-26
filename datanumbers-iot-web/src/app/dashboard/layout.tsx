"use client";

import { useState } from "react";
import Header from "./components/Header";

export default function DashboardLayout({ children }) {
  const [showMenu, setShowMenu] = useState(true);
  const ToggleMenu = () => {
    return setShowMenu(!showMenu);
  };

  return (
    <div id="db-wrapper" className={`${showMenu ? "" : "toggled"}`}>
      <div id="page-content">
        <div className="header">
          <Header
            data={{
              showMenu: showMenu,
              SidebarToggleMenu: ToggleMenu,
            }}
          />
        </div>
      </div>
    </div>
  );
}
