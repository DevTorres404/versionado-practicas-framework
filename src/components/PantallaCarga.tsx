interface Props {
  isLoading: boolean;
}

export default function PantallaCarga({ isLoading }: Props) {
  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8"
      style={{ background: 'linear-gradient(160deg, #1a0000 0%, #0D0D0D 100%)' }}
    >
      {/* Pokéball */}
      <div className="relative w-36 h-36 animate-spin" style={{ animationDuration: '1.2s' }}>
        {/* Top half — red */}
        <div
          className="absolute top-0 left-0 w-full h-1/2 rounded-t-full"
          style={{ background: 'linear-gradient(135deg, #FF2222, #CC0000)' }}
        />
        {/* Bottom half — white */}
        <div
          className="absolute bottom-0 left-0 w-full h-1/2 rounded-b-full"
          style={{ background: 'linear-gradient(135deg, #EEEEEE, #CCCCCC)' }}
        />
        {/* Dividing band */}
        <div
          className="absolute top-1/2 left-0 w-full h-[6px] -translate-y-1/2"
          style={{ background: '#111' }}
        />
        {/* Center button */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full z-10"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #FFFFFF, #CCCCCC)',
            border: '4px solid #111',
            boxShadow: '0 0 0 2px #444',
          }}
        />
      </div>

      {/* Title */}
      <div className="flex flex-col items-center gap-2">
        <h1
          className="text-3xl font-black tracking-[0.3em] uppercase font-mono"
          style={{ color: '#CC1100', textShadow: '0 0 20px #CC110088' }}
        >
          POKÉDEX OS
        </h1>
        {/* Blinking loading text */}
        <p
          className="text-sm font-mono tracking-widest animate-pulse"
          style={{ color: '#33FF88' }}
        >
          ▶ CARGANDO DATOS...
        </p>
      </div>

      {/* Progress bar (animated shimmer) */}
      <div
        className="w-48 h-1.5 rounded-full overflow-hidden"
        style={{ background: '#222' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #CC1100, #FF4444, #CC1100)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s linear infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
