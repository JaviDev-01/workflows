import React, { useState } from 'react';
import { Button } from './Button';
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthScreenProps {
  onLogin: (username: string) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'REGISTER') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: username
        });
        // We pass the display name to the parent
        onLogin(username);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // If login successful, we pass the display name or email
        onLogin(userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User');
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Ha ocurrido un error.";
      if (err.code === 'auth/email-already-in-use') msg = "El correo ya está registrado.";
      if (err.code === 'auth/invalid-credential') msg = "Credenciales incorrectas.";
      if (err.code === 'auth/weak-password') msg = "La contraseña es muy débil (min 6 caracteres).";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
    setError(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#e8e6df] flex items-center justify-center p-6">
      
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-paper opacity-80 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 perspective-1000">
          {/* Card Body */}
          <div className="bg-[#fdfbf7] p-8 rounded-[4px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-[#d1d0c9] relative overflow-hidden transform rotate-[-1deg] animate-pop">
              
              {/* Decorative Header Stamp */}
              <div className="absolute top-4 right-4 border-2 border-red-800/20 text-red-900/30 font-bold uppercase text-[10px] p-2 rotate-12 rounded-sm tracking-widest pointer-events-none">
                  Bookmol<br/>Official
              </div>

              {/* Logo / Header */}
              <div className="text-center mb-8 border-b-2 border-gray-900 pb-6 border-double">
                  <div className="inline-block p-4 rounded-full bg-gray-900 text-[#fdfbf7] mb-4 shadow-lg">
                      <Sparkles size={32} />
                  </div>
                  <h1 className="text-4xl font-serif-book font-bold text-gray-900 tracking-tight">
                    Bookmol
                  </h1>
                  <p className="font-serif-book italic text-gray-500 mt-2 text-sm">
                    {mode === 'LOGIN' ? 'Acceso a la Sociedad Literaria' : 'Registro de Nuevo Miembro'}
                  </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-md border border-red-100 text-center">
                      {error}
                    </div>
                  )}

                  {mode === 'REGISTER' && (
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre de Pluma</label>
                        <div className="relative">
                            <input 
                              className="w-full bg-gray-50 border border-gray-200 rounded-sm px-3 py-3 pl-10 text-sm font-medium text-gray-800 focus:outline-none focus:border-gray-900 transition-colors"
                              placeholder="Tu nombre público..." 
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              required
                            />
                            <User className="absolute left-3 top-3 text-gray-400" size={16}/>
                        </div>
                    </div>
                  )}

                  <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Correo Electrónico</label>
                      <div className="relative">
                          <input 
                            type="email"
                            className="w-full bg-gray-50 border border-gray-200 rounded-sm px-3 py-3 pl-10 text-sm font-medium text-gray-800 focus:outline-none focus:border-gray-900 transition-colors"
                            placeholder="correo@ejemplo.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                          <Mail className="absolute left-3 top-3 text-gray-400" size={16}/>
                      </div>
                  </div>

                  <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Contraseña</label>
                      <div className="relative">
                          <input 
                            type="password"
                            className="w-full bg-gray-50 border border-gray-200 rounded-sm px-3 py-3 pl-10 text-sm font-medium text-gray-800 focus:outline-none focus:border-gray-900 transition-colors"
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                          />
                          <Lock className="absolute left-3 top-3 text-gray-400" size={16}/>
                      </div>
                  </div>

                  <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gray-900 text-[#fdfbf7] py-3.5 rounded-sm font-serif-book font-bold uppercase tracking-wider text-sm shadow-md hover:bg-gray-800 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18}/> : (
                          <>
                            {mode === 'LOGIN' ? 'Entrar' : 'Registrarse'} <ArrowRight size={16}/>
                          </>
                        )}
                      </button>
                  </div>
              </form>
              
              <div className="mt-6 text-center">
                  <button 
                    onClick={toggleMode}
                    type="button" 
                    className="text-xs font-bold text-gray-500 hover:text-gray-900 underline underline-offset-4 decoration-dashed decoration-gray-300 hover:decoration-gray-900 transition-all"
                  >
                    {mode === 'LOGIN' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya eres miembro? Inicia sesión'}
                  </button>
              </div>

              {/* Footer Texture */}
              <div className="mt-8 text-center">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-2"></div>
                  <p className="text-[10px] text-gray-400 font-mono">EST. 2023 • BIBLIOTECA COMUNITARIA</p>
              </div>
          </div>
      </div>
    </div>
  );
};