import React, { useState } from 'react';

export default function GitHubDashboard() {
  const [loading, setLoading] = useState(true);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: 'calc(100vh - 140px)', 
        position: 'relative',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #D5DBDB',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
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
            background: '#ffffff',
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
          display: 'block'
        }}
      />
    </div>
  );
}
