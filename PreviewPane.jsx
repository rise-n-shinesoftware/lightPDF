import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

const Thumbnail = ({ index, currentDocument, currentPageIndex, onPageSelect }) => {
  const [data, setData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once it's visible to cache it
        }
      },
      { rootMargin: '150px' } // Pre-load slightly before scrolling into view
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !data && !error) {
      let isMounted = true;
      const loadData = async () => {
        try {
          const ext = currentDocument.path.split('.').pop().toLowerCase();
          let fetchedData;
          if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
            const base64 = await invoke('read_image_file', { path: currentDocument.path });
            const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
            fetchedData = `data:image/${mime};base64,${base64}`;
          } else {
            const base64 = await invoke('render_pdf_thumbnail', { path: currentDocument.path, pageIndex: index });
            fetchedData = `data:image/png;base64,${base64}`;
          }
          if (isMounted) setData(fetchedData);
        } catch (e) {
          if (isMounted) setError(true);
        }
      };
      loadData();
      return () => { isMounted = false; };
    }
  }, [isVisible, data, error, currentDocument.path, index]);

  useEffect(() => {
    // Sync scrolling when the main view changes page
    if (index === currentPageIndex && elementRef.current) {
      elementRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPageIndex, index]);

  return (
    <div ref={elementRef} onClick={() => onPageSelect(index)} className={`cursor-pointer border-2 rounded p-1 transition-colors ${index === currentPageIndex ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-transparent hover:border-gray-300 bg-white shadow-sm'}`}>
      <div className="w-full aspect-[3/4] flex items-center justify-center bg-gray-50 rounded-sm overflow-hidden shadow-inner">
        {data ? (
          <img src={data} alt={`Page ${index + 1}`} className="w-full h-full object-contain bg-white" />
        ) : error ? (
          <span className="text-xs text-red-400 font-medium">Error</span>
        ) : (
          <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        )}
      </div>
      <div className={`text-center text-xs mt-1.5 font-medium ${index === currentPageIndex ? 'text-blue-600' : 'text-gray-500'}`}>Page {index + 1}</div>
    </div>
  );
};

export default function PreviewPane({ currentDocument, currentPageIndex, onClose, onPageSelect }) {
  if (!currentDocument?.path || currentDocument.pageCount === 0) {
    return null;
  }

  const pages = Array.from({ length: currentDocument.pageCount }, (_, i) => i);

  return (
    <div className="w-48 bg-gray-100 border-r border-gray-300 flex flex-col shrink-0 z-10 shadow-inner">
      <div className="p-3 border-b border-gray-300 flex justify-between items-center bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 px-2 py-0.5 rounded font-bold text-lg leading-none">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {pages.map(index => (
          <Thumbnail 
            key={index} 
            index={index} 
            currentDocument={currentDocument} 
            currentPageIndex={currentPageIndex} 
            onPageSelect={onPageSelect} 
          />
        ))}
      </div>
    </div>
  );
}