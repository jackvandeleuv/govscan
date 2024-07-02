import React, { useState } from "react";

interface AuthPanelProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>
}

const AuthPanel: React.FC<AuthPanelProps> = ( {setIsLoggedIn} ) => {
  
  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={handleLogout}
        className="bg-blue-400 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Sign Out
      </button>
    </div>
  );
  
  
};

export default AuthPanel;
