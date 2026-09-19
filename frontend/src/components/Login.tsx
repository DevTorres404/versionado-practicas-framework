import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Credenciales incorrectas');
        }
        return res.json();
      })
      .then(data => {
        console.log("[Sistema] Login exitoso con el backend. Token recibido:", data.token);
        setError('');
        login(data.email);
        navigate('/');
      })
      .catch(err => {
        console.error("[Sistema] Error en login:", err);
        setError('Credenciales incorrectas. Usa admin@upse.edu.ec / 123456');
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6 sm:p-8 border border-stone-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-stone-900">MultiCatálogo</h2>
          <p className="text-stone-500 mt-2">Ingresa a tu cuenta para continuar</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Correo Electrónico
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition"
              placeholder="admin@upse.edu.ec"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
