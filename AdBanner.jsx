import React, { useEffect, useState } from 'react';
import { open } from '@tauri-apps/api/shell';

export default function AdBanner() {
  const [adData, setAdData] = useState(null);

  useEffect(() => {
    // Fetch ad data from your own server
    // Example JSON: { "imageUrl": "https://...", "link": "https://...", "text": "Check out our new software!" }
    const fetchAd = async () => {
      try {
        // Replace with your actual endpoint
        const response = await fetch('https://raw.githubusercontent.com/risenshinesoftware/ads/main/current-ad.json');
        if (response.ok) {
          const data = await response.json();
          setAdData(data);
        }
      } catch (error) {
        console.log("Could not load ad, user might be offline.");
      }
    };

    fetchAd();
  }, []);

  // Handle link clicks natively using Tauri's shell to open the user's default browser
  const handleAdClick = async () => {
    if (adData?.link) {
      await open(adData.link);
    }
  };

  if (!adData) return null; // Collapse if no ad is loaded

  return (
    <div className="h-[90px] w-full bg-gray-100 border-t border-gray-300 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors" onClick={handleAdClick}>
      {adData.imageUrl ? (
          <img src={adData.imageUrl} alt="Advertisement" className="h-full object-contain" />
      ) : (
          <span className="text-gray-500 font-medium">{adData.text || "ADVERTISEMENT"}</span>
      )}
    </div>
  );
}