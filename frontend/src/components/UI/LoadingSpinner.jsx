import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[2.5px]',
    lg: 'w-12 h-12 border-[3px]',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-slate-800 border-t-indigo-500 rounded-full animate-spin`}
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </div>
        <div className={`absolute inset-0 rounded-full bg-indigo-500/10 blur-sm`} />
      </div>
    </div>
  );
};

export default LoadingSpinner;
