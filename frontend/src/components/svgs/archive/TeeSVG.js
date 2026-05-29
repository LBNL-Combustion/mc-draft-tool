import React from 'react';

const TeeSVG = ({ radius, orientation, diameter, height = 3, rotation = 0 }) => {
  // Scale based on diameter and height
  const heightMultiplier = height / 3; // normalize to base height of 3
  const pipeWidth = radius * 2;
  
  // Use rotation prop if provided, otherwise fall back to orientation
  const rotationAngle = rotation || (orientation === "horizontal" ? 90 : 0);
  
  // Draw T-junction: vertical pipe with left side outlet
  const elbowWidth = radius * 4;
  const elbowHeight = radius * 4 * heightMultiplier;
  const verticalHeight = radius * 3 * heightMultiplier;
  const horizontalWidth = radius * 2;
  
  const topY = 0;
  const bottomY = elbowHeight;
  const verticalLeft = radius;
  const verticalRight = verticalLeft + pipeWidth;
  const sideOutletY = elbowHeight / 2 - pipeWidth / 2;
  const sideOutletBottom = sideOutletY + pipeWidth;
  const leftX = 0;
  
  // Draw T shape: vertical pipe from top to bottom with left horizontal outlet in the middle
  const pathData = `
    M ${verticalLeft} ${topY}
    L ${verticalRight} ${topY}
    L ${verticalRight} ${sideOutletY}
    L ${verticalLeft + horizontalWidth} ${sideOutletY}
    L ${verticalLeft + horizontalWidth} ${sideOutletBottom}
    L ${verticalRight} ${sideOutletBottom}
    L ${verticalRight} ${bottomY}
    L ${verticalLeft} ${bottomY}
    L ${verticalLeft} ${sideOutletBottom}
    L ${leftX} ${sideOutletBottom}
    L ${leftX} ${sideOutletY}
    L ${verticalLeft} ${sideOutletY}
    Z
  `;
  
  // Calculate rotation center and angle
  const cx = elbowWidth / 2;
  const cy = elbowHeight / 2;
  
  // Keep dimensions the same (will rotate around center)
  const svgWidth = elbowWidth;
  const svgHeight = elbowHeight;
  
  // Connection points: top inlet, bottom outlet, left side outlet
  const baseConnectionPoints = [
    { x: verticalLeft + pipeWidth / 2, y: topY, type: 'inlet', direction: 'top' },
    { x: leftX, y: sideOutletY + pipeWidth / 2, type: 'outlet', direction: 'left' },
    { x: verticalLeft + pipeWidth / 2, y: bottomY, type: 'outlet', direction: 'bottom' }
  ];

  // Rotate connection points based on rotation angle
  const rotatePointByAngle = (x, y, angle) => {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  };

  const rotateDirectionByAngle = (direction, angle) => {
    const directions = ['top', 'right', 'bottom', 'left'];
    const currentIndex = directions.indexOf(direction);
    if (currentIndex === -1) return direction;
    const rotations = Math.round(angle / 90) % 4;
    const newIndex = (currentIndex + rotations) % 4;
    return directions[newIndex];
  };

  const connectionPoints = rotationAngle !== 0
    ? baseConnectionPoints.map(point => {
        const rotated = rotatePointByAngle(point.x, point.y, rotationAngle);
        return {
          ...point,
          x: rotated.x,
          y: rotated.y,
          direction: rotateDirectionByAngle(point.direction, rotationAngle)
        };
      })
    : baseConnectionPoints;
  
  return (
    <svg 
      width={svgWidth} 
      height={svgHeight} 
      viewBox={`0 0 ${elbowWidth} ${elbowHeight}`} 
      className="pipe-svg"
      data-connection-points={JSON.stringify(connectionPoints)}
    >
      <g transform={`rotate(${rotationAngle} ${cx} ${cy})`}>
        <path 
          d={pathData}
          fill="#3a3f4b" 
          stroke="#61dafb" 
          strokeWidth="2"
        />
      </g>
    </svg>
  );
};

export default TeeSVG;
