
interface Props {
  nombre: string;
  id: number;
  imagen: string;
  tipos: string[];
  stats: { base_stat: number; stat: { name: string } }[];
  altura?: number;
  peso?: number;
}

const STATS_CONFIG: Record<string, { label: string; abbr: string }> = {
  hp: { label: 'Hit Points', abbr: 'HP' },
  attack: { label: 'Attack', abbr: 'ATK' },
  defense: { label: 'Defense', abbr: 'DEF' },
  'special-attack': { label: 'Sp. Attack', abbr: 'SpA' },
  'special-defense': { label: 'Sp. Defense', abbr: 'SpD' },
  speed: { label: 'Speed', abbr: 'SPD' },
};

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

export default function TarjetaPokemon({
  nombre,
  id,
  imagen,
  tipos,
  stats,
  altura,
  peso,
}: Props) {
  const totalStats = stats.reduce((acc, s) => acc + s.base_stat, 0);

  return (
    /* ── Pokédex Body ─────────────────────────────────────── */
    <div className="flex items-stretch rounded-2xl overflow-hidden shadow-2xl select-none"
         style={{ background: '#CC1100', boxShadow: '0 0 0 4px #990000, 0 12px 40px rgba(0,0,0,0.6)' }}>

      {/* ── LEFT PANEL ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-4 w-72 flex-shrink-0"
           style={{ background: 'linear-gradient(160deg, #DD1100 0%, #BB0900 100%)' }}>

        {/* Top bezel: lens + indicator dots */}
        <div className="flex items-center gap-2 px-1">
          {/* Big blue camera lens */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ background: 'radial-gradient(circle at 35% 35%, #88DDFF, #1177CC)', boxShadow: '0 0 0 4px #004499, 0 0 16px #0088FF99' }}>
            <div className="w-5 h-5 rounded-full bg-white/40" />
          </div>
          {/* Indicator LEDs */}
          <div className="flex gap-2 ml-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#FF3333', boxShadow: '0 0 6px #FF3333' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#FFCC00', boxShadow: '0 0 6px #FFCC00' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#44FF66', boxShadow: '0 0 6px #44FF66' }} />
          </div>
        </div>

        {/* LCD Screen */}
        <div className="rounded-lg overflow-hidden flex-1 flex flex-col items-center justify-center p-2"
             style={{ background: '#0D0D0D', border: '4px solid #BBBBBB', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)' }}>
          {/* Screen inner glow */}
          <div className="relative flex flex-col items-center justify-center w-full">
            {/* Two red sub-indicator dots */}
            <div className="flex gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            </div>
            {imagen ? (
              <img
                src={imagen}
                alt={nombre}
                className="w-44 h-44 object-contain drop-shadow-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-28 h-28 flex items-center justify-center text-slate-600 text-xs font-mono">
                NO SIGNAL
              </div>
            )}
            {/* Type badges on screen */}
            <div className="flex gap-1 mt-2 flex-wrap justify-center">
              {tipos.map((tipo) => (
                <span
                  key={tipo}
                  className="text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: TYPE_COLORS[tipo.toLowerCase()] ?? '#888888' }}
                >
                  {tipo}
                </span>
              ))}
            </div>
            {/* Screen scanlines effect */}
            <div className="absolute inset-0 pointer-events-none opacity-5 rounded-lg"
                 style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)' }} />
          </div>
        </div>

        {/* Bottom control panel */}
        <div className="flex items-center justify-between px-1">
          {/* Left controls cluster */}
          <div className="flex flex-col gap-1.5">
            {/* Black circular button */}
            <div className="w-6 h-6 rounded-full"
                 style={{ background: 'radial-gradient(circle at 35% 35%, #555, #111)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
            {/* Green bar button */}
            <div className="w-14 h-3 rounded-full"
                 style={{ background: 'linear-gradient(90deg, #33BB44, #22AA33)', boxShadow: '0 2px 3px rgba(0,0,0,0.4)' }} />
          </div>

          {/* D-Pad */}
          <div className="relative w-9 h-9 flex-shrink-0">
            {/* Horizontal bar */}
            <div className="absolute top-1/2 left-0 w-full h-3 -translate-y-1/2 rounded-sm"
                 style={{ background: '#111', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1)' }} />
            {/* Vertical bar */}
            <div className="absolute left-1/2 top-0 w-3 h-full -translate-x-1/2 rounded-sm"
                 style={{ background: '#111', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        {/* Blue bar button */}
        <div className="h-2.5 rounded-full mx-1"
             style={{ background: 'linear-gradient(90deg, #2277DD, #3388FF)', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
      </div>

      {/* ── HINGE ───────────────────────────────────────── */}
      <div className="w-3 flex-shrink-0 flex flex-col"
           style={{ background: 'linear-gradient(90deg, #880800, #CC1100, #880800)' }}>
        {/* Hinge screws */}
        <div className="flex-1 flex flex-col items-center justify-evenly py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full"
                 style={{ background: 'radial-gradient(circle at 35% 35%, #CC8800, #885500)' }} />
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3 flex-1 min-w-0"
           style={{ background: 'linear-gradient(160deg, #CC1000 0%, #AA0800 100%)' }}>

        {/* Top black display — Name + ID + metrics */}
        <div className="rounded-lg p-4 flex flex-col gap-2"
             style={{ background: '#0D0D0D', border: '2px solid #880800', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8)' }}>
          <div className="flex items-baseline justify-between">
            <span className="text-white font-bold capitalize text-xl tracking-wide leading-none">
              {nombre}
            </span>
            <span className="text-xs font-mono text-slate-400">
              #{String(id).padStart(3, '0')}
            </span>
          </div>
          {(altura !== undefined || peso !== undefined) && (
            <div className="flex gap-3 text-[10px] font-mono text-slate-500">
              {altura !== undefined && <span>HT {(altura / 10).toFixed(1)}m</span>}
              {peso !== undefined && <span>WT {(peso / 10).toFixed(1)}kg</span>}
              <span className="ml-auto text-slate-600">BST {totalStats}</span>
            </div>
          )}
        </div>

        {/* Stats grid — 2x3 cyan button style */}
        <div className="grid grid-cols-2 gap-1.5">
          {stats.map(({ base_stat, stat }) => {
            const cfg = STATS_CONFIG[stat.name] ?? { label: stat.name, abbr: stat.name.toUpperCase().slice(0, 3) };
            const pct = Math.min(100, (base_stat / 200) * 100);
            return (
              <div key={stat.name}
                   className="rounded-md p-3 flex flex-col gap-1.5"
                   style={{
                     background: 'linear-gradient(135deg, #33AAEE, #1188CC)',
                     boxShadow: '0 3px 0 #007AB8, inset 0 1px 0 rgba(255,255,255,0.3)',
                     border: '1px solid #007AB8',
                   }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-wider">
                    {cfg.abbr}
                  </span>
                  <span className="text-base font-bold text-white font-mono leading-none">
                    {base_stat}
                  </span>
                </div>
                {/* Mini progress bar inside each button */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div
                    className="h-full rounded-full bg-white/80 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Middle: gray/white small buttons row */}
        <div className="flex gap-1.5 items-center">
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="w-7 h-4 rounded-sm"
                   style={{ background: 'linear-gradient(135deg, #DDDDDD, #AAAAAA)', boxShadow: '0 2px 0 #888888, inset 0 1px 0 rgba(255,255,255,0.8)' }} />
            ))}
          </div>
          {/* Separator */}
          <div className="h-3 w-px mx-1" style={{ background: '#990800' }} />
          {/* Green dark buttons */}
          <div className="flex gap-1 flex-1">
            {[0, 1].map((i) => (
              <div key={i} className="flex-1 h-4 rounded-sm"
                   style={{ background: 'linear-gradient(135deg, #227733, #115522)', boxShadow: '0 2px 0 #0A3318', border: '1px solid #0A3318' }} />
            ))}
          </div>
        </div>

        {/* Bottom: dark green buttons row + yellow button */}
        <div className="flex gap-1.5 items-center mt-auto">
          <div className="flex gap-1 flex-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 h-5 rounded-sm"
                   style={{ background: 'linear-gradient(135deg, #1A5C2A, #0D3318)', boxShadow: '0 2px 0 #061A0D', border: '1px solid #061A0D' }} />
            ))}
          </div>
          {/* Yellow circular button */}
          <div className="w-7 h-7 rounded-full flex-shrink-0"
               style={{ background: 'radial-gradient(circle at 35% 35%, #FFEE44, #CC9900)', boxShadow: '0 3px 0 #996600, 0 0 8px rgba(255,200,0,0.4)', border: '1px solid #AA8800' }} />
        </div>
      </div>
    </div>
  );
}