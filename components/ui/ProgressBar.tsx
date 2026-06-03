import React from "react";

export const ProgressBar = ({ current, total, className = "" }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div className="bg-teal-deep h-2 rounded-full progress-fill" style={{ width: `${(current / total) * 100}%` }} />
  </div>
);

export default ProgressBar;
