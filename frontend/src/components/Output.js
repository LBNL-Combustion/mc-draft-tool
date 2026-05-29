import React from 'react';
import { presetData } from '../data';

const Output = ({
    items,
    showComponentList,
    onPresetSelect,
    payloadText,
    setPayloadText,
    outputError,
    outputStatus,
    selectedItemIndex,
    setSelectedItemIndex,
    handleDiametersChange,
    handleHeightChange,
    handleAmbientTempChange,
    handleOrientationChange,
    availableOrientations = [
      { value: 'vertical',   label: 'Vertical' },
      { value: 'horizontal', label: 'Horizontal' },
    ],
    handleSequenceOrderChange,
    handleDelete,
    handleClearDesign,
    onFinalizeDesign,
    finalizeDisabled = false,
    finalizeTitle = '',
    isCalculating = false,
    setShowComponentList,
}) => {
    const selectedItem = selectedItemIndex !== null && selectedItemIndex !== undefined ? items[selectedItemIndex] : null;
    const canEditHeight = selectedItem?.type === 'Pipe';
    const canEditOrientation =
        selectedItem?.componentType === 'pipe-straight' ||
        selectedItem?.componentType === 'chimney-straight';

    const selectedTypeLabel = (() => {
        if (!selectedItem) return '';
        if (selectedItem.componentType === 'cap') return 'Cap';
        if (selectedItem.componentType?.startsWith('chimney-')) return 'Chimney';
        if (selectedItem.componentType === 'tee') return 'Tee';
        if (selectedItem.componentType?.startsWith('elbow-')) return 'Elbow';
        return 'Pipe';
    })();

    return (
        <div className="output-container">
            {selectedItem && (
                <div className="pipe-info-sidebar">
                    <div className="pipe-info-header">
                        <strong>{selectedItem.name}</strong>
                        <button
                            className='close-btn'
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemIndex && setSelectedItemIndex(null);
                            }}
                        >×</button>
                    </div>
                    <div className="pipe-info-body">
                        <div className="info-row">
                            <label>Type</label>
                            <input value={selectedTypeLabel} disabled readOnly />
                        </div>
                        <div className="info-row">
                            <label>Material</label>
                            <select disabled>
                                <option>Stainless</option>
                            </select>
                        </div>
                        <div className="info-row">
                            <label>Diameter</label>
                            <select
                                id={`diameter-${selectedItemIndex}`}
                                name="diameter"
                                onChange={(e) => handleDiametersChange(selectedItemIndex, e.target.selectedOptions)}
                                value={selectedItem.selectedDiameter || selectedItem.diameters?.[0] || '6'}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="3">3 in</option>
                                <option value="4">4 in</option>
                                <option value="5">5 in</option>
                                <option value="6">6 in</option>
                                <option value="7">7 in</option>
                                <option value="8">8 in</option>
                            </select>
                        </div>
                        {canEditHeight && (
                            <div className="info-row">
                                <label>Length</label>
                                <input
                                    type="number"
                                    id={`height-${selectedItemIndex}`}
                                    name="height"
                                    min="0.5"
                                    step="0.25"
                                    value={selectedItem.length ?? selectedItem.height ?? 3}
                                    onChange={(e) => handleHeightChange(selectedItemIndex, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ width: '70px' }}
                                />
                                <span style={{ marginLeft: '4px' }}>ft</span>
                            </div>
                        )}
                        {canEditOrientation && (
                            <div className="info-row">
                                <label>Orientation</label>
                                <select
                                    id={`orientation-${selectedItemIndex}`}
                                    name="orientation"
                                    onChange={(e) => handleOrientationChange(selectedItemIndex, e.target.value)}
                                    value={selectedItem.orientation || 'vertical'}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {availableOrientations.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="info-row">
                            <label>Ambient Temp</label>
                            <input
                                type="number"
                                value={selectedItem.ambientTempF ?? ''}
                                onChange={(e) => handleAmbientTempChange(selectedItemIndex, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            /> <span>°F</span>
                        </div>
                        <div className="info-row">
                            <label>Part Number</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={selectedItem.sequenceOrder ?? ''}
                                onChange={(e) => handleSequenceOrderChange(selectedItemIndex, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '70px' }}
                            />
                        </div>
                        <button
                            className='delete-component-btn'
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(selectedItemIndex);
                            }}
                        >Delete Component</button>
                    </div>
                </div>
            )}

            <div className="design-actions">
                <button
                    className="finalize-design-btn"
                    title={finalizeTitle}
                    onClick={() => {
                        if (typeof onFinalizeDesign === 'function') {
                            onFinalizeDesign();
                        } else if (typeof setShowComponentList === 'function') {
                            setShowComponentList(true);
                        }
                    }}
                    disabled={finalizeDisabled}
                >
                    Finalize Design
                </button>

                <button
                    className="clear-design-btn"
                    onClick={handleClearDesign}
                    disabled={items.length === 0 || isCalculating}
                >
                    Clear Design
                </button>
            </div>

            {showComponentList && items.length > 0 && (
                <div className="component-list">
                    <h3>Component List</h3>
                    {items.map((item, index) => (
                        <div key={index} className="component-list-item">
                            <strong>{index + 1}. {item.name}</strong>
                            <div className="component-details">
                                <span>Type: {item.type || item.wallType || 'Single'}</span>
                                <span>Diameter: {item.selectedDiameter || item.diameters?.[0] || '6'} in</span>
                                <span>Orientation: {item.orientation || 'vertical'}</span>
                                {item.type !== 'Elbow' && <span>Length: {item.length ?? item.height ?? 3} ft</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="calculate-section">
                {presetData.length > 0 && (
                    <div className="preset-section">
                        {presetData.map((preset, idx) => (
                            <button
                                hidden={true}
                                key={idx}
                                className="preset-btn"
                                title={preset.description}
                                onClick={() => {
                                    if (onPresetSelect) onPresetSelect(preset.config);
                                }}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                )}

                <textarea
                    hidden={true}
                    className="payload-input"
                    rows={6}
                    placeholder='Enter JSON payload, e.g. {"key": "value"}'
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                />

                {outputStatus && (
                    <div className="result-error" style={{ borderColor: '#2563eb', background: '#eff6ff' }}>
                        <span className="result-fail" style={{ color: '#1d4ed8' }}>⏳ Status</span>
                        <pre className="result-error-text" style={{ color: '#1e3a8a' }}>{outputStatus}</pre>
                    </div>
                )}

                {outputError && (
                    <div className="result-error">
                        <span className="result-fail">&#10007; Error</span>
                        <pre className="result-error-text">{outputError}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Output;
