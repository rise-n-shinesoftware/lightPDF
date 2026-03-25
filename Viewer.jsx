import React, { useState, useRef } from 'react';

export default function Viewer({ pageData, isLoading, error, zoomLevel = 100, isMagnifierActive = false }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const imageRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!isMagnifierActive || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Ensure the magnifier only activates when hovering over the actual document bounds
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      setMousePos({ x, y });
      setShowMagnifier(true);
    } else {
      setShowMagnifier(false);
    }
  };

  const handleMouseLeave = () => setShowMagnifier(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-8 text-center">
        <svg className="w-12 h-12 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p className="font-semibold text-lg">Failed to load document</p>
        <p className="text-sm text-red-400 mt-2 max-w-md bg-red-50 p-2 rounded border border-red-100">{error}</p>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p>Open a file to begin viewing.</p>
      </div>
    );
  }

  const MAGNIFIER_SIZE = 160;
  const MAGNIFIER_ZOOM = 2; // Zooms image by exactly 200% inside the lens

  return (
    <div className="flex-1 overflow-auto p-4 bg-gray-200 flex justify-center">
      <div 
        className="relative inline-block h-fit"
        style={{ width: `${zoomLevel}%` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <img
          ref={imageRef}
          src={pageData}
          alt="Rendered PDF page"
          className="shadow-xl w-full h-auto pointer-events-none bg-white"
        />
        {isMagnifierActive && showMagnifier && imageRef.current && (
          <div 
            className="absolute pointer-events-none border-4 border-blue-300 rounded-full shadow-2xl z-50 bg-white"
            style={{ width: MAGNIFIER_SIZE, height: MAGNIFIER_SIZE,
              left: mousePos.x - MAGNIFIER_SIZE / 2,
              top: mousePos.y - MAGNIFIER_SIZE / 2,
              backgroundImage: `url(${pageData})`, backgroundRepeat: 'no-repeat',
              backgroundSize: `${imageRef.current.width * MAGNIFIER_ZOOM}px ${imageRef.current.height * MAGNIFIER_ZOOM}px`,
              backgroundPosition: `-${mousePos.x * MAGNIFIER_ZOOM - MAGNIFIER_SIZE / 2}px -${mousePos.y * MAGNIFIER_ZOOM - MAGNIFIER_SIZE / 2}px`,
            }} />
        )}
      </div>
    </div>
  );
}