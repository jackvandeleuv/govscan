import React from "react";

interface CollapseButtonProps {
  onClick: () => void;
}

const CollapseButton: React.FC<CollapseButtonProps> = ({ onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="mr-3 flex items-center justify-center rounded-full border border-gray-400 p-1 px-3 text-gray-400 hover:bg-gray-15">
            <div className="text-xs font-medium">
                Toggle PDF
            </div>
        </button>
    );
  };

export default CollapseButton;
