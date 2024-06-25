import React from 'react';

const ChatSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-200 p-4 rounded-lg mb-4 animate-pulse">
      <div className="h-10 bg-gray-300 rounded mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded"></div>
      </div>
      <div className="h-4 bg-gray-300 rounded w-1/3 mt-4"></div>
    </div>
  );
};

export default ChatSkeleton;
