import React, { useState, useEffect } from 'react';

function Timer({ duration, onTimeout, startTime, active }) {
  const [remainingTime, setRemainingTime] = useState(duration);

  useEffect(() => {
    if (!active || !startTime) {
      setRemainingTime(duration);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      
      setRemainingTime(remaining);
      
      if (remaining === 0 && onTimeout) {
        onTimeout();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [duration, startTime, active, onTimeout]);

  if (!active) {
    return null;
  }

  const percentage = (remainingTime / duration) * 100;
  const isUrgent = remainingTime <= 5;

  return (
    <div className={`timer ${isUrgent ? 'urgent' : ''}`}>
      <div className="timer-display">
        <span className="time-left">{remainingTime}s</span>
        <div className="timer-bar">
          <div 
            className="timer-fill" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default Timer;