
import React, { useEffect, useState } from 'react';

export const Waveform: React.FC<{ active: boolean }> = ({ active }) => {
  const [bars, setBars] = useState<number[]>(Array(12).fill(10));

  useEffect(() => {
    let interval: number;
    if (active) {
      interval = window.setInterval(() => {
        setBars(bars.map(() => Math.floor(Math.random() * 40) + 10));
      }, 100);
    } else {
      setBars(Array(12).fill(10));
    }
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex items-center gap-1 h-16">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-yellow-400 rounded-full transition-all duration-100"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
};
