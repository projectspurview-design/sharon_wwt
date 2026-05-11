// src/pages/Reports.jsx
import React from 'react';

export default function Reports() {
  return (
    <div
      style={{
        background: '#f3f6fb',
        minHeight: '100vh',
        padding: 24
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 24
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: '#0f172a'
          }}
        >
          Unloading
        </h1>

        <p style={{ color: '#64748b', marginTop: 8 }}>
          Unloading page content will be shown here.
        </p>
      </div>
    </div>
  );
}