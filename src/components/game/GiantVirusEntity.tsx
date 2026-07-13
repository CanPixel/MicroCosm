import { GiantAmoebaVirus } from './GiantAmoebaVirus';
import { OrganismNameLabel } from './OrganismNameLabel';

type Props = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  showName?: boolean;
};

export function GiantVirusEntity({ position, size, duration, delay, opacity, showName = false }: Props) {
  return (
    <div
      className="absolute"
      style={{
        top: position.y,
        left: position.x,
        width: size,
        height: size,
        opacity,
        animation: `giant-virus-drift ${Math.max(1.6, duration / 16)}s ease-in-out ${delay}s infinite alternate`,
      }}
    >
      <OrganismNameLabel name="Mimivirus-like giant virus" size={size} showName={showName} />
      <GiantAmoebaVirus size={size} />
    </div>
  );
}
