import React, { useState } from 'react';

export default function Sidebar({ history = [], onOpenHistory }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-60 h-full bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Access</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          <li className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">All Documents</li>
          <li className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">Recent</li>
        </ul>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Favorites</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          <li className="text-gray-400 italic px-2">No favorites yet</li>
        </ul>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">History</h2>
        </div>
        <input 
            type="text" 
            placeholder="Search history..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs p-1.5 mb-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
        <ul className="space-y-1 text-sm text-gray-700">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item, index) => (
              <li 
                key={index}
                onClick={() => onOpenHistory(item.path)}
                className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded truncate" 
                title={item.path}
              >
                {item.title}
              </li>
            ))
          ) : (
            <li className="text-gray-400 italic px-2">No history found</li>
          )}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 shadow-inner">
        <p className="font-semibold text-gray-700">Rise-n-Shine Software</p>
        <a href="mailto:risenshinesoftware@gmail.com" className="hover:text-blue-500 transition-colors">risenshinesoftware@gmail.com</a>
      </div>
    </aside>
  );
}