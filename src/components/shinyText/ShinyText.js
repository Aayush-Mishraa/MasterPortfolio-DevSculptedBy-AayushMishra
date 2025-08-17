import React from 'react';
import './ShinyText.css';

const ShinyText = ({ text, disabled = false, speed = 5, className = '', style = {} }) => {
  const animationDuration = `${speed}s`;

  return (
    <h1
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{ 
        animationDuration: disabled ? 'none' : animationDuration,
        ...style 
      }}
    >
      {text}
    </h1>
  );
};

export default ShinyText;
