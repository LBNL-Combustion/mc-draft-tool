import React from 'react';

const ElbowSVG = ({ radius, orientation, diameter, rotation = 0 }) => {
  // Scale based on diameter
  const elbowWidth = radius * 4;
  const elbowHeight = radius * 4;
  const pipeWidth = radius * 2;
  
  // Use rotation prop if provided, otherwise fall back to orientation
  const rotationAngle = rotation || (orientation === "horizontal" ? 90 : 0);
  
  // Draw 90-degree elbow with rounded outer corner
  // Bottom inlet, curves to right outlet
  const outerRadius = elbowWidth - pipeWidth; // Outer arc radius
  const innerRadius = outerRadius - pipeWidth; // Inner arc radius
  
  // Start at bottom left, go up, curve right, go down, curve left
  const pathData = `
    M 0 ${elbowHeight}
    L 0 ${pipeWidth}
    A ${outerRadius} ${outerRadius} 0 0 1 ${pipeWidth} 0
    L ${elbowWidth} 0
    L ${elbowWidth} ${pipeWidth}
    A ${innerRadius} ${innerRadius} 0 0 0 ${pipeWidth} ${pipeWidth + innerRadius}
    L ${pipeWidth} ${elbowHeight}
    Z
  `;
  
  // Calculate rotation center and angle
  const cx = elbowWidth / 2;
  const cy = elbowHeight / 2;
  
  // Connection points for vertical elbow: right (outlet) and bottom (inlet)
  const baseConnectionPoints = [
    { x: elbowWidth, y: pipeWidth / 2, type: 'outlet', direction: 'right' },
    { x: pipeWidth / 2, y: elbowHeight, type: 'inlet', direction: 'bottom' }
  ];

  // Rotate point 90 degrees clockwise around the center
  const rotatePointClockwise = (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx - dy,
      y: cy + dx
    };
  };

  const rotateDirectionClockwise = (direction) => {
    switch (direction) {
      case 'top':
        return 'right';
      case 'right':
        return 'bottom';
      case 'bottom':
        return 'left';
      case 'left':
        return 'top';
      default:
        return direction;
    }
  };

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
  
  // Keep dimensions the same (square shape)
  const svgWidth = elbowWidth;
  const svgHeight = elbowHeight;
  
  return (
    <svg 
      width={svgWidth} 
      height={svgHeight} 
      viewBox={`0 0 ${elbowWidth} ${elbowHeight}`} 
      className="pipe-svg" 
      preserveAspectRatio="xMidYMid meet"
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

export default ElbowSVG;
