import { useState, useEffect } from 'react';

export default function LiveClock({ tz, tzLabel }) {
  const [time, setTime] = useState(() => format(tz));

  useEffect(() => {
    const id = setInterval(() => setTime(format(tz)), 1000);
    return () => clearInterval(id);
  }, [tz]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        color: '#e2e8f0',
        letterSpacing: '0.08em',
      }}>
        {time}
      </span>
      {tzLabel && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: '#64748b',
          marginLeft: 5,
        }}>
          {tzLabel}
        </span>
      )}
    </span>
  );
}

function format(tz) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}
