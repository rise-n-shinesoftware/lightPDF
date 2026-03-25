import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import AdBanner from './AdBanner';
import Sidebar from './Sidebar';
import LicenseModal from './LicenseModal';
import Viewer from './Viewer';
import PreviewPane from './PreviewPane';

export default function App() {
  const [isLicensed, setIsLicensed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tabs, setTabs] = useState([{ id: 'welcome', path: null, title: 'Welcome.pdf', active: true }]);
  const [currentPageData, setCurrentPageData] = useState(null);
  const [currentDocument, setCurrentDocument] = useState({ path: null, pageCount: 0 });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('lightpdf_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Check license status on boot
    invoke('check_license_status').then((status) => {
      setIsLicensed(status);
    });
  }, []);

  const openFile = useCallback(async (filePath) => {
    if (!filePath) {
      setCurrentDocument({ path: null, pageCount: 0 });
      setCurrentPageData(null);
      setPageError(null);
      return;
    }

    setIsLoadingPage(true);
    setCurrentPageData(null); // Clear previous document view
    setPageError(null);
    try {
        const ext = filePath.split('.').pop().toLowerCase();
        
        // Basic Image format bypass
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
            const base64 = await invoke('read_image_file', { path: filePath });
            setCurrentDocument({ path: filePath, pageCount: 1 });
            setCurrentPageIndex(0);
            const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
            setCurrentPageData(`data:image/${mime};base64,${base64}`);
            return;
        }

        // 1. Get page count from the new Rust command
        const pageCount = await invoke('get_pdf_page_count', { path: filePath });
        setCurrentDocument({ path: filePath, pageCount });
        setCurrentPageIndex(0);

        // 2. Render the first page
        const pageData = await invoke('render_pdf_page', { path: filePath, pageIndex: 0 });
        setCurrentPageData(`data:image/png;base64,${pageData}`);
    } catch (error) {
        console.error("Failed to open or render PDF:", error);
        setPageError(error.toString());
        setCurrentDocument({ path: null, pageCount: 0 });
        setCurrentPageData(null);
    } finally {
        setIsLoadingPage(false);
    }
  }, []); // useCallback with empty dependency array as it has no external dependencies from props/state

  const showFileOpenDialog = async () => {
    const selectedPath = await open({
      multiple: false,
      filters: [{
        name: 'Supported Documents',
        extensions: [
          'pdf', 'cbr', 'cbz', 'epub', 'mobi', 'txt', 'md', 'docx', 'pptx', 'xlsx',
          'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'rtf', 'html', 'htm', 'djvu',
          'xps', 'odt', 'ods', 'odp'
        ]
      }, {
        name: 'All Files',
        extensions: ['*']
      }]
    });

    if (typeof selectedPath === 'string') {
      openFromPath(selectedPath);
    }
  };

  const openFromPath = (selectedPath) => {
    const filename = selectedPath.split(/[/\\]/).pop();

    // Update history, filter out duplicates, and slice to max 20 items
    setHistory(prev => {
      const newHistory = [{ path: selectedPath, title: filename }, ...prev.filter(h => h.path !== selectedPath)].slice(0, 20);
      localStorage.setItem('lightpdf_history', JSON.stringify(newHistory));
      return newHistory;
    });

    // Update tabs
    setTabs(prevTabs => {
      const exists = prevTabs.find(t => t.path === selectedPath);
      if (!exists) {
        const newTab = { id: selectedPath, path: selectedPath, title: filename, active: true };
        return [...prevTabs.map(t => ({ ...t, active: false })), newTab];
      } else {
        return prevTabs.map(t => ({ ...t, active: t.path === selectedPath }));
      }
    });
    
    openFile(selectedPath);
  };

  const handleActivate = async (licenseData) => {
    const success = await invoke('activate_license', licenseData);
    if (success) {
      setIsLicensed(true);
      setIsModalOpen(false);
    }
    return success; // Return success status to the modal
  };

  const handleTabClick = (tabId) => {
    const clickedTab = tabs.find(t => t.id === tabId);
    if (!clickedTab || clickedTab.active) return;

    setTabs(tabs.map(t => ({ ...t, active: t.id === tabId })));
    openFile(clickedTab.path);
  };

  const closeTab = (e, tabId) => {
    e.stopPropagation(); // Prevent tab click event
    const tabToRemove = tabs.find(t => t.id === tabId);
    const remainingTabs = tabs.filter(t => t.id !== tabId);

    let nextActivePath = null;
    if (remainingTabs.length > 0) {
      if (tabToRemove.active) {
        remainingTabs[remainingTabs.length - 1].active = true;
        nextActivePath = remainingTabs[remainingTabs.length - 1].path;
      } else {
        nextActivePath = remainingTabs.find(t => t.active)?.path || null;
      }
    }

    setTabs([...remainingTabs]);
    if (tabToRemove.active) {
      openFile(nextActivePath);
    }
  };

  const handlePageChange = async (newIndex) => {
    if (!currentDocument.path || newIndex < 0 || newIndex >= currentDocument.pageCount || isLoadingPage) {
        return; // Index out of bounds or already loading
    }
    setIsLoadingPage(true);
    setPageError(null);
    try {
        const pageData = await invoke('render_pdf_page', { path: currentDocument.path, pageIndex: newIndex });
        setCurrentPageData(`data:image/png;base64,${pageData}`);
        setCurrentPageIndex(newIndex);
    } catch (error) {
        console.error(`Failed to render page ${newIndex}:`, error);
        setPageError(error.toString());
    } finally {
        setIsLoadingPage(false);
    }
};

  const handleZoomToggle = () => {
    const newState = !isZoomActive;
    setIsZoomActive(newState);
    if (!newState) {
      setZoomLevel(100);
    }
  };

  // Keyboard shortcuts for page navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent turning pages if typing in an input field (like search or license form)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        handlePageChange(currentPageIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        handlePageChange(currentPageIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, currentDocument.pageCount, isLoadingPage, currentDocument.path]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {isModalOpen && (
        <LicenseModal onActivate={handleActivate} onClose={() => setIsModalOpen(false)} />
      )}

      {/* Top Bar */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 hover:bg-gray-100 rounded mr-2"
        >
          ☰
        </button>
        <button
          onClick={showFileOpenDialog}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded mr-4 flex items-center justify-center w-28 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoadingPage}
        >
          {isLoadingPage ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading...</span>
            </>
          ) : (
            <span>Open File...</span>
          )}
        </button>
        <div className="flex-1 flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <div 
              key={tab.id} 
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-3 py-1 text-sm rounded-t cursor-pointer group ${tab.active ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500' : 'hover:bg-gray-100'}`}
            >
              <span className="truncate max-w-[150px]" title={tab.title}>{tab.title}</span>
              <button 
                onClick={(e) => closeTab(e, tab.id)}
                className={`w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 transition-colors ${tab.active ? 'text-blue-400' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isLicensed ? (
            <button onClick={() => setIsModalOpen(true)} className="text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1 rounded shadow-sm font-semibold">
              Remove Ads
            </button>
          ) : (
            <span className="text-xs text-green-600 font-semibold border border-green-200 bg-green-50 px-2 py-1 rounded">PRO</span>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar history={history} onOpenHistory={openFromPath} />}
        {showPreviewPane && currentDocument.path && (
          <PreviewPane currentDocument={currentDocument} currentPageIndex={currentPageIndex} onClose={() => setShowPreviewPane(false)} onPageSelect={handlePageChange} />
        )}
        <main className="flex-1 relative bg-gray-100 flex flex-col">
          <Viewer pageData={currentPageData} isLoading={isLoadingPage} error={pageError} zoomLevel={zoomLevel} isMagnifierActive={isMagnifierActive} />
        </main>
      </div>

      {/* Bottom Utility Bar */}
      <footer className="h-8 bg-white border-t border-gray-200 flex items-center px-4 justify-between text-xs text-gray-600 shrink-0">
        {currentDocument.path ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPageIndex - 1)}
              disabled={currentPageIndex <= 0 || isLoadingPage}
              className="px-2 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              &lt; Prev
            </button>
            <span>
              Page {currentPageIndex + 1} of {currentDocument.pageCount}
            </span>
            <button
              onClick={() => handlePageChange(currentPageIndex + 1)}
              disabled={currentPageIndex >= currentDocument.pageCount - 1 || isLoadingPage}
              className="px-2 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next &gt;
            </button>
          </div>
        ) : (
          <span>No document open</span>
        )}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Preview</span>
            <button
              onClick={() => setShowPreviewPane(!showPreviewPane)}
              disabled={!currentDocument.path}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${showPreviewPane ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showPreviewPane ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Magnifier</span>
            <button
              onClick={() => setIsMagnifierActive(!isMagnifierActive)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isMagnifierActive ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isMagnifierActive ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Zoom</span>
            <button
              onClick={handleZoomToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isZoomActive ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isZoomActive ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className={`flex items-center gap-2 transition-opacity ${!isZoomActive ? 'opacity-50' : 'opacity-100'}`}>
             <span className="w-8 text-right">{zoomLevel}%</span>
             <input 
                type="range" min="20" max="250" 
                value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} 
                disabled={!isZoomActive}
                className="w-24 accent-blue-400" 
             />
          </div>
        </div>
      </footer>

      {/* Ad System */}
      {!isLicensed && <AdBanner />}
    </div>
  );
}