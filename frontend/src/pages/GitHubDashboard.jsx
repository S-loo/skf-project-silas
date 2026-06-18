import React, { useState } from 'react';

export default function GitHubDashboard() {
  const [loading, setLoading] = useState(true);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: 'calc(100vh - 110px)', 
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {loading && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F8FAFC',
            zIndex: 10
          }}
        >
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      )}
      <iframe 
        src="/github-dashboard/index.html" 
        title="GitHub Repository Dashboard"
        onLoad={() => setLoading(false)}
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none',
          display: 'block',
          background: 'transparent'
        }}
      />
    </div>
  );
}
