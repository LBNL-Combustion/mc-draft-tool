import React from 'react';

const PipeSVG = ({ radius, orientation, diameter, height = 3 }) => {
  const isVertical = orientation === "vertical" || orientation === "180";
  const heightMultiplier = height / 3; // normalize to base height of 3
  
  if (isVertical) {
    const pipeWidth = radius * 2;
    const pipeHeight = radius * 6 * heightMultiplier;
    
    // Connection points for vertical pipe: top and bottom middle
    const connectionPoints = [
      { x: pipeWidth / 2, y: 0, type: 'outlet', direction: 'top' },
      { x: pipeWidth / 2, y: pipeHeight, type: 'inlet', direction: 'bottom' }
    ];
    
    return (
      <svg 
        width={pipeWidth} 
        height={pipeHeight} 
        viewBox={`0 0 ${pipeWidth} ${pipeHeight}`} 
        className="pipe-svg"
        data-connection-points={JSON.stringify(connectionPoints)}
      >
        {/* Vertical rectangular pipe */}
        <rect 
          x={0} 
          y={0} 
          width={pipeWidth} 
          height={pipeHeight} 
          fill="#3a3f4b" 
          stroke="#61dafb" 
          strokeWidth="2"
        />
      </svg>
    );
    } else {
      const pipeWidth = radius * 6 * heightMultiplier;
      const pipeHeight = radius * 2;
      
      // Connection points for horizontal pipe: left and right middle
      const connectionPoints = [
        { x: 0, y: pipeHeight / 2, type: 'inlet', direction: 'left' },
        { x: pipeWidth, y: pipeHeight / 2, type: 'outlet', direction: 'right' }
      ];
      
      return (
        <svg 
          width={pipeWidth} 
          height={pipeHeight} 
          viewBox={`0 0 ${pipeWidth} ${pipeHeight}`} 
          className="pipe-svg"
          data-connection-points={JSON.stringify(connectionPoints)}
        >
          {/* Horizontal rectangular pipe */}
          <rect 
            x="0" 
            y="0" 
            width={pipeWidth} 
            height={pipeHeight} 
            fill="#3a3f4b" 
            stroke="#61dafb" 
            strokeWidth="2"
          />
        </svg>
      );
  }
};

export default PipeSVG;
