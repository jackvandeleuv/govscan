import React from 'react';

const ChatSkeleton: React.FC = () => {
  return (
    <div className="flex border-r bg-gray-00 pb-4 animate-pulse">
      <div className="mt-4 w-1/5 flex-grow text-right font-nunito text-gray-60">
        <div className="flex items-center justify-center">
          <div className="h-4 w-16 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="mt-4 w-4/5 pr-3 font-nunito font-bold text-gray-90">
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
};

export default ChatSkeleton;
