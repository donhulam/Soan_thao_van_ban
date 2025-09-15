
import React from 'react';

const AIIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9.5 13a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1 5 0Z" />
    <path d="M19.5 13a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1 5 0Z" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z" />
    <path d="M8 17a4 4 0 0 0 8 0" />
  </svg>
);

export default AIIcon;
