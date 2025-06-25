import React from 'react';

function CurrentTheme({ theme }) {
  if (!theme) {
    return (
      <div className="current-theme">
        <h2 className="theme-title">🎯 Sélection du thème en cours...</h2>
      </div>
    );
  }

  return (
    <div className="current-theme">
      <h2 className="theme-title">🎯 Thème actuel</h2>
      <div className="theme-display">
        {theme}
      </div>
    </div>
  );
}

export default CurrentTheme;