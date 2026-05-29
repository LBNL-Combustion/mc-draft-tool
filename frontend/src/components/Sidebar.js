import React from 'react';
import pipeSvg from './svgs/pipe.svg';
import elbow90Svg from './svgs/90_opt.svg';
import elbow45Svg from './svgs/45_opt.svg';
import teeSvg from './svgs/tee.svg';
import chimneyTopStraightSvg from './svgs/pipe.svg';
import chimneyTopTeeSvg from './svgs/tee.svg';
import chimneyTop30Svg from './svgs/30_opt.svg';
import capSvg from './svgs/cap_opt.svg';

const Sidebar = ({ items, showComponentList, setShowComponentList, handleClearDesign, showStoveMenu, setShowStoveMenu, doorAngle, setDoorAngle, hasResults, onShowResults, finalizeDisabled = false, finalizeTitle = '', selectedFireProfile = 'balanced', fireProfileOptions = [], onFireProfileChange = () => {}, onFinalizeDesign, elevationFt = '', setElevationFt = () => {} }) => {
  const handleDragStart = (e, itemTemplate) => {
    e.dataTransfer.setData('item', JSON.stringify(itemTemplate));
    e.dataTransfer.effectAllowed = 'move';
  };

  const movableSections = [
    {
      title: 'Stove Pipes',
      components: [
        {
          label: 'Straight',
          svgSrc: pipeSvg,
          item: {
            name: 'Straight Pipe',
            type: 'Pipe',
            componentType: 'pipe-straight',
            diameters: ['6'],
            selectedDiameter: '6',
            orientation: 'vertical',
            wallType: 'Type A',
            surface: 'smooth',
            length: 3,
            height: 3,
            rotation: 0,
            rotationStep: 15,
          },
        },
        {
          label: 'Elbow 90°',
          svgSrc: elbow90Svg,
          item: {
            name: 'Elbow 90°',
            type: 'Elbow',
            componentType: 'elbow-90',
            diameters: ['6'],
            selectedDiameter: '6',
            orientation: 'vertical',
            wallType: 'Type A',
            surface: 'smooth',
            height: 1,
            rotation: 0,
            rotationStep: 90,
          },
        },
        {
          label: 'Elbow 45°',
          svgSrc: elbow45Svg,
          item: {
            name: 'Elbow 45°',
            type: 'Elbow',
            componentType: 'elbow-45',
            diameters: ['6'],
            selectedDiameter: '6',
            orientation: 'vertical',
            wallType: 'Type A',
            surface: 'smooth',
            height: 1,
            rotation: 0,
            rotationStep: 45,
            angleLabel: '45°',
          },
        },
        {
          label: 'Tee',
          svgSrc: teeSvg,
          item: {
            name: 'Tee',
            type: 'Elbow',
            componentType: 'tee',
            diameters: ['6'],
            selectedDiameter: '6',
            orientation: 'vertical',
            wallType: 'Type A',
            surface: 'smooth',
            height: 1,
            rotation: 0,
            rotationStep: 90,
          },
        },
      ],
    },
    {
      title: 'Chimneys',
      components: [
        {
          label: 'Straight',
          svgSrc: chimneyTopStraightSvg,
          item: {
            name: 'Chimney Straight',
            type: 'Pipe',
            componentType: 'chimney-straight',
            diameters: ['6'],
            selectedDiameter: '6',
            orientation: 'vertical',
            wallType: 'Type A',
            surface: 'smooth',
            length: 3,
            height: 3,
            rotation: 0,
            rotationStep: 15,
          },
        },
        {
          label: 'Tee',
          svgSrc: chimneyTopTeeSvg,
          item: {
            name: 'Chimney Tee',
            type: 'Elbow',
            componentType: 'chimney-tee',
            diameters: ['6'],
            selectedDiameter: '6',
            orientation: 'vertical',
            wallType: 'Type A',
            surface: 'smooth',
            height: 1,
            rotation: 0,
            rotationStep: 90,
          },
        },
        {
          label: '30°',
          svgSrc: chimneyTop30Svg,
          item: {
            name: 'Chimney 30°',
            type: 'Elbow',
            componentType: 'chimney-30',
            diameters: ['6'],
            selectedDiameter: '6',
            orientation: 'vertical',
            wallType: 'Type A',
            surface: 'smooth',
            height: 1,
            rotation: 0,
            rotationStep: 30,
            angleLabel: '30°',
          },
        },
      ],
    },
    {
      title: 'Termination',
      components: [
        {
          label: 'Cap',
          svgSrc: capSvg,
          item: {
            name: 'Cap',
            type: 'Elbow',
            componentType: 'cap',
            diameters: ['6'],
            selectedDiameter: '6',
            wallType: 'Type A',
            surface: 'smooth',
            height: 1,
            rotation: 0,
            rotationStep: 90,
          },
        },
      ],
    },
  ];

  return (
    <div className="sidebar">
      {movableSections.map(section => (
        <div key={section.title} className="sidebar-section">
          <div className="sidebar-category">{section.title}</div>
          <div className="sidebar-icon-grid">
            {section.components.map((component, index) => (
              <div
                key={`${section.title}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, component.item)}
                className="sidebar-icon-item"
                title={component.item.name}
              >
                <img
                  src={component.svgSrc}
                  alt={component.label}
                  className={`sidebar-icon-img${section.title === 'Stove Pipes' ? ' no-invert' : ''}`}
                  draggable={false}
                />
                <span className="sidebar-icon-label">{component.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
 <div className="sidebar-section">
        <div className="sidebar-category">Elevation and Fire Profile</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            fontSize: '13px',
            color: '#cbd5e1',
            fontWeight: 600,
          }}
        >
          <label htmlFor="sidebar-elevation">Elevation</label>
          <input
            id="sidebar-elevation"
            type="number"
            value={elevationFt}
            onChange={(e) => setElevationFt(e.target.value)}
            style={{
              width: '70px',
              padding: '4px 6px',
              borderRadius: '4px',
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#e2e8f0',
              fontSize: '13px',
            }}
          />
          <span>ft</span>
        </div>
        <div
          style={{
            textAlign: 'left',
          }}
        >
          <label
            htmlFor="fire-profile-select"
            style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}
          >
            Fire Profile
          </label>
          <select
            id="fire-profile-select"
            value={selectedFireProfile}
            onChange={(e) => onFireProfileChange(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: '#e2e8f0', fontSize: '13px' }}
          >
            {fireProfileOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      {hasResults && (
        <button
          className="view-results-btn"
          onClick={onShowResults}
        >
          View Results
        </button>
      )}



    </div>
  );
};

export default Sidebar;