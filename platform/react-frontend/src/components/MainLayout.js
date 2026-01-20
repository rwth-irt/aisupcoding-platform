// src/components/MainLayout.js

import React from 'react';
import { Outlet } from 'react-router-dom';


function MainLayout() {
  return (
    <>
      <Outlet />
      <div className="logo-container">
        <img src="/irt.png" alt="IRT Logo" />
      </div>
    </>
  );
}

export default MainLayout;