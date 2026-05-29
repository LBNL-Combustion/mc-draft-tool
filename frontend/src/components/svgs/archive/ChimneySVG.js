import React from 'react';

const ChimneySVG = ({ radius, diameter, height = 3 }) => {
  const heightMultiplier = height / 3; // normalize to base height of 3
  const pipeWidth = radius * 2;
  const pipeHeight = radius * 6 * heightMultiplier;
  const triangleBaseWidth = pipeWidth * 2;
  const triangleHeight = pipeWidth;
  const svgWidth = triangleBaseWidth;
  const totalHeight = pipeHeight + triangleHeight;
  const pipeXOffset = (triangleBaseWidth - pipeWidth) / 2;
  
  // Connection point for chimney: only bottom middle
  const connectionPoints = [
    { x: svgWidth / 2, y: totalHeight, type: 'inlet', direction: 'bottom' }
  ];
  
  return (
    <svg 
      width={svgWidth} 
      height={totalHeight} 
      viewBox={`0 0 ${svgWidth} ${totalHeight}`} 
      className="pipe-svg"
      data-connection-points={JSON.stringify(connectionPoints)}
    >
      {/* Triangle cap for chimney */}
      <polygon
        points={`0,${triangleHeight} ${triangleBaseWidth/2},0 ${triangleBaseWidth},${triangleHeight}`}
        fill="#61dafb"
        stroke="#61dafb"
        strokeWidth="2"
      />
      {/* Vertical rectangular pipe */}
      <rect 
        x={pipeXOffset} 
        y={triangleHeight} 
        width={pipeWidth} 
        height={pipeHeight} 
        fill="#3a3f4b" 
        stroke="#61dafb" 
        strokeWidth="2"
      />
    </svg>
  );
};

export default ChimneySVG;
