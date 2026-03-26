import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Download, AlertCircle } from 'lucide-react';

export default function AppUpdater() {
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    // Only check for updates if running as a native app (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;

    const checkForUpdates = async () => {
      try {
        // Get current native app info
        const appInfo = await App.getInfo();
        
        // Fetch latest version info from Vercel deployment
        // using a full URL so the webview correctly resolves it,
        // or a relative URL since it's hosted from the same domain
        const res = await fetch('/version.json?t=' + new Date().getTime());
        if (!res.ok) return;
        
        const latestData = await res.json();
        
        // Compare versionCode (build number). You can also use semantic version string comparison.
        const currentVersionCode = parseInt(appInfo.build, 10) || 0;
        const latestVersionCode = parseInt(latestData.versionCode, 10) || 0;

        if (latestVersionCode > currentVersionCode) {
          setUpdateInfo(latestData);
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };

    checkForUpdates();
  }, []);

  if (!updateInfo) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          backgroundColor: '#fef3c7',
          color: '#d97706',
          width: '64px', height: '64px',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <AlertCircle size={32} />
        </div>
        
        <h2 style={{ margin: '0 0 12px', color: '#111827', fontSize: '24px', fontWeight: 'bold' }}>
          Update Available!
        </h2>
        
        <p style={{ margin: '0 0 8px', color: '#4b5563', fontSize: '16px' }}>
          Version <strong>{updateInfo.version}</strong> is ready to install.
        </p>
        
        <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
          {updateInfo.message}
        </p>
        
        <a
          href={updateInfo.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            backgroundColor: '#10b981', color: '#fff',
            textDecoration: 'none', padding: '14px 24px',
            borderRadius: '8px', fontWeight: '600', fontSize: '16px',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
          }}
        >
          <Download size={20} />
          Download Update
        </a>
      </div>
    </div>
  );
}
