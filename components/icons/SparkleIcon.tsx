
import React from 'react';

const SparkleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
    <path d="M5 2v2" />
    <path d="M19 2v2" />
    <path d="M5 20v2" />
    <path d="M19 20v2" />
    <path d="M2 5h2" />
    <path d="M2 19h2" />
    <path d="M20 5h2" />
    <path d="M20 19h2" />
  </svg>
);

export default SparkleIcon;
