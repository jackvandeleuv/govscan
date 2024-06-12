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
        className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
  
  
};

export default AuthPanel;
