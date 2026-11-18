import { scoreTone } from '../lib/theme';

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
  stroke?: number;
  caption?: string;
}

export function ScoreRing({ score, size = 132, label = 'Puntaje', stroke = 9, caption }: ScoreRingProps) {
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safe / 100);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label}: ${safe} de 100`}>
        <circle
          className="score-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="score-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          stroke={scoreTone(safe)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring__center">
        <strong style={{ color: scoreTone(safe) }}>{safe}</strong>
        <span>{caption ?? label}</span>
      </div>
    </div>
  );
}
