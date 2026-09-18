import { useEffect, useRef, useState } from 'react';
import TarjetaUsuario from './components/TarjetaUsuario';
import TarjetaPokemon from './components/TarjetaPokemon';
import Modal from './components/Modal';
import PantallaCarga from './components/PantallaCarga';

interface Usuario {
  name: string;
  email: string;
  phone: string;
}

interface Pokemon {
  name: string;
  id: number;
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: {
        front_default: string | null;
      };
    };
  };
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  height: number;
  weight: number;
}

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoUsuario, setCargandoUsuario] = useState<boolean>(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [listaPokemon, setListaPokemon] = useState<string[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [filtro, setFiltro] = useState('');

  const [pokemonSeleccionado, setPokemonSeleccionado] = useState<string>('');
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [cargandoPokemon, setCargandoPokemon] = useState(false);
  const [errorPokemon, setErrorPokemon] = useState('');
  const [cachePokemon, setCachePokemon] = useState<Record<string, Pokemon>>({});

  // ── Música de fondo (Archivo MP3) ───────────────────────
  const audioFondoRef = useRef<HTMLAudioElement | null>(null);
  const [musicaActiva, setMusicaActiva] = useState(false);

  const iniciarMusica = () => {
    if (!audioFondoRef.current) {
      audioFondoRef.current = new Audio('/batalla.mp3');
      audioFondoRef.current.loop = true;
      audioFondoRef.current.volume = 0.3; // Volumen bajito para que no sature
    }
    audioFondoRef.current.play().catch(() => {
      console.warn('El navegador bloqueó el autoplay o el archivo no existe.');
      setMusicaActiva(false);
    });
    setMusicaActiva(true);
  };

  const detenerMusica = () => {
    if (audioFondoRef.current) {
      audioFondoRef.current.pause();
    }
    setMusicaActiva(false);
  };

  const toggleMusica = () => musicaActiva ? detenerMusica() : iniciarMusica();

  useEffect(() => () => detenerMusica(), []);

  useEffect(() => {
    let activo = true;
    fetch('https://pokeapi.co/api/v2/pokemon?limit=151')
      .then((respuesta) => respuesta.json())
      .then((datos) => {
        if (activo) {
          const nombres = datos.results.map((p: { name: string }) => p.name);
          setListaPokemon(nombres);
        }
      })
      .catch((error) => console.error('Error al cargar la lista de Pokémon', error))
      .finally(() => {
        if (activo) setCargandoLista(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const obtenerDatos = async () => {
    setCargandoUsuario(true);
    try {
      const respuesta = await fetch('https://jsonplaceholder.typicode.com/users/1');
      const datos = await respuesta.json();
      setUsuario(datos);
    } catch (error) {
      console.error('Error al consumir la API', error);
    } finally {
      setCargandoUsuario(false);
    }
  };

  const buscarPokemon = async (nombre: string) => {
    setPokemonSeleccionado(nombre);

    if (cachePokemon[nombre]) {
      setPokemon(cachePokemon[nombre]);
      setErrorPokemon('');
      return;
    }

    setCargandoPokemon(true);
    setErrorPokemon('');
    try {
      const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre.toLowerCase()}`);
      if (!respuesta.ok) {
        setPokemon(null);
        setErrorPokemon(`No se encontró el Pokémon "${nombre}"`);
        return;
      }
      const datos: Pokemon = await respuesta.json();
      setPokemon(datos);
      setCachePokemon((prev) => ({ ...prev, [nombre]: datos }));
    } catch {
      setPokemon(null);
      setErrorPokemon('Error al consultar la API de Pokémon');
    } finally {
      setCargandoPokemon(false);
    }
  };

  // Sonido de selección de UI (dos tonos cortos, estilo consola)
  const sonarSeleccion = () => {
    try {
      const ctx = new AudioContext();
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.06);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.06);
      });
    } catch { /* navegador sin soporte */ }
  };
  const abrirModalPokemon = () => {
    setModalAbierto(true);
    if (!pokemon) {
      const inicial = listaPokemon[0] ?? 'bulbasaur';
      buscarPokemon(inicial);
    }
  };

  const textoFiltro = filtro.trim().toLowerCase();
  const listaFiltrada = listaPokemon
    .map((nombre, indice) => ({ nombre, id: indice + 1 }))
    .filter(
      ({ nombre, id }) =>
        nombre.includes(textoFiltro) || String(id).startsWith(textoFiltro),
    );

  const imagenPokemon =
    pokemon?.sprites.other?.['official-artwork']?.front_default ??
    pokemon?.sprites.front_default ??
    '';

  return (
    <>
      <PantallaCarga isLoading={cargandoLista} />
      <div className="p-8 bg-slate-100 min-h-screen">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Fundamentos de React</h1>
        {/* Botón de música */}
        <button
          onClick={toggleMusica}
          title={musicaActiva ? 'Detener música' : 'Reproducir música'}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer transition-all"
          style={{
            background: musicaActiva ? '#1a5c2a' : '#1e293b',
            color: musicaActiva ? '#33FF88' : '#94a3b8',
            border: `1px solid ${musicaActiva ? '#33FF88' : '#334155'}`,
            boxShadow: musicaActiva ? '0 0 8px #33FF8844' : 'none',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            {musicaActiva
              ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              : <path d="M8 5v14l11-7z"/>}
          </svg>
          {musicaActiva ? 'MÚSICA ON' : 'MÚSICA OFF'}
        </button>
      </div>
      <button
        onClick={obtenerDatos}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-all cursor-pointer"
      >
        {cargandoUsuario ? 'Consultando API...' : 'Obtener Usuario'}
      </button>
      {usuario && (
        <TarjetaUsuario nombre={usuario.name} correo={usuario.email} telefono={usuario.phone} />
      )}

      <div className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Pokémon</h2>
        <button
          onClick={abrirModalPokemon}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-all cursor-pointer"
        >
          Obtener Pokémon
        </button>

        <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)}>
          <div className="flex flex-col md:flex-row h-[600px]" style={{ background: '#0D0D0D' }}>
            {/* Columna Izquierda: Lista Pokédex */}
            <div className="w-full md:w-52 flex flex-col h-full flex-shrink-0"
                 style={{ background: 'linear-gradient(160deg, #DD1100 0%, #BB0900 100%)', boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.3)' }}>

              {/* Bezel superior de la lista */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: 'radial-gradient(circle at 35% 35%, #88DDFF, #1177CC)', boxShadow: '0 0 0 2px #004499, 0 0 8px #0088FF88' }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                </div>
                <div className="flex gap-1.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF3333', boxShadow: '0 0 4px #FF3333' }} />
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFCC00', boxShadow: '0 0 4px #FFCC00' }} />
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#44FF66', boxShadow: '0 0 4px #44FF66' }} />
                </div>
                <span className="ml-auto font-mono text-[10px] font-bold tracking-widest"
                      style={{ color: '#FFDD44', textShadow: '0 0 6px #FFDD44' }}>
                  KANTO
                </span>
              </div>

              {/* Input filtro estilo LCD */}
              <div className="px-3 pb-2">
                <div className="rounded-md overflow-hidden"
                     style={{ background: '#0D0D0D', border: '3px solid #888888', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8)' }}>
                  <input
                    type="text"
                    placeholder="BUSCAR / #ID..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold tracking-wider focus:outline-none bg-transparent"
                    style={{ color: '#33FF88', caretColor: '#33FF88' }}
                  />
                </div>
              </div>

              {/* Lista estilo botonera */}
              <ul className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#880000 #990000' }}>
                {cargandoLista ? (
                  <li className="p-4 text-xs font-mono text-center" style={{ color: '#33FF88' }}>CARGANDO...</li>
                ) : listaFiltrada.length === 0 ? (
                  <li className="p-4 text-xs font-mono text-center" style={{ color: '#FF4444' }}>SIN RESULTADOS</li>
                ) : (
                  listaFiltrada.map(({ nombre, id }) => {
                    const seleccionado = pokemonSeleccionado === nombre;
                    return (
                      <li key={nombre}>
                        <button
                          type="button"
                          onClick={() => { sonarSeleccion(); buscarPokemon(nombre); }}
                          className="w-full text-left rounded-md px-3 py-1.5 text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-between"
                          style={
                            seleccionado
                              ? {
                                  background: 'linear-gradient(135deg, #33AAEE, #1188CC)',
                                  color: '#FFFFFF',
                                  boxShadow: '0 3px 0 #007AB8, inset 0 1px 0 rgba(255,255,255,0.3)',
                                  border: '1px solid #007AB8',
                                  transform: 'translateY(1px)',
                                }
                              : {
                                  background: 'linear-gradient(135deg, #1A5588, #0D3A66)',
                                  color: '#88CCFF',
                                  boxShadow: '0 2px 0 #082644',
                                  border: '1px solid #082644',
                                }
                          }
                        >
                          <span className="capitalize tracking-wide">{nombre}</span>
                          <span className="text-[10px] opacity-60">
                            #{String(id).padStart(3, '0')}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              {/* Controles decorativos de la lista */}
              <div className="px-3 pb-3 pt-1 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full"
                     style={{ background: 'radial-gradient(circle at 35% 35%, #555, #111)', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
                <div className="flex-1 h-2 rounded-full"
                     style={{ background: 'linear-gradient(90deg, #33BB44, #22AA33)', boxShadow: '0 2px 3px rgba(0,0,0,0.4)' }} />
                <div className="w-5 h-5 rounded-full"
                     style={{ background: 'radial-gradient(circle at 35% 35%, #FFEE44, #CC9900)', boxShadow: '0 2px 0 #996600' }} />
              </div>
            </div>

            {/* Bisagra */}
            <div className="hidden md:flex w-2 flex-shrink-0 flex-col"
                 style={{ background: 'linear-gradient(90deg, #880800, #CC1100, #880800)' }}>
              <div className="flex-1 flex flex-col items-center justify-evenly py-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                       style={{ background: 'radial-gradient(circle at 35% 35%, #CC8800, #885500)' }} />
                ))}
              </div>
            </div>

            {/* Columna Derecha: Estadísticas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-center items-center"
                 style={{ background: '#111111' }}>
              {cargandoPokemon ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
                       style={{ borderTopColor: '#33AAEE', borderRightColor: '#33AAEE' }} />
                  <p className="text-xs font-mono font-bold tracking-widest" style={{ color: '#33FF88' }}>
                    CARGANDO...
                  </p>
                </div>
              ) : errorPokemon ? (
                <p className="text-xs font-mono" style={{ color: '#FF4444' }}>{errorPokemon}</p>
              ) : pokemon ? (
                <TarjetaPokemon
                  nombre={pokemon.name}
                  id={pokemon.id}
                  imagen={imagenPokemon}
                  tipos={pokemon.types.map((t) => t.type.name)}
                  stats={pokemon.stats}
                  altura={pokemon.height}
                  peso={pokemon.weight}
                />
              ) : (
                <p className="text-xs font-mono tracking-widest" style={{ color: '#336644' }}>
                  ▶ SELECCIONAR POKÉMON
                </p>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
    </>
  );
}
