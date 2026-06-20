import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  UserPlus, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Cpu, 
  Compass, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthScreenProps {
  onSuccess: (user: { email: string; isGuest?: boolean }) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMess, setErrorMess] = useState<string | null>(null);
  const [successMess, setSuccessMess] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Load saved company logo if available
  useEffect(() => {
    const saved = localStorage.getItem('orcaplus_company_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.logo) {
          setCompanyLogo(parsed.logo);
        }
      } catch (_) {}
    }
  }, []);

  // Initialize simulated users database
  useEffect(() => {
    const saved = localStorage.getItem('vista_aerea_local_users');
    if (!saved) {
      const defaultUsers = [
        { email: 'demo@vistaereadrones.com.br', password: '123' },
        { email: 'admin@vistaerea.com.br', password: '123' },
        { email: 'noslendis@gmail.com', password: '123' } // Pre-seed helpful user
      ];
      localStorage.setItem('vista_aerea_local_users', JSON.stringify(defaultUsers));
    }
  }, []);

  const cleanMessages = () => {
    setErrorMess(null);
    setSuccessMess(null);
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    cleanMessages();
  };

  const getLocalUsers = () => {
    const saved = localStorage.getItem('vista_aerea_local_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMess('Por favor, insira seu e-mail.');
      return;
    }

    setLoading(true);
    cleanMessages();

    // Simulating small lag for realistic UI state/UX feel on iPhone
    setTimeout(() => {
      const users = getLocalUsers();

      if (mode === 'login') {
        if (!password) {
          setErrorMess('Por favor, insira sua senha.');
          setLoading(false);
          return;
        }

        const found = users.find((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        if (found) {
          if (found.password === password) {
            setSuccessMess('Login realizado com sucesso! Carregando painel...');
            setTimeout(() => {
              onSuccess({ email: found.email });
            }, 1000);
          } else {
            setErrorMess('Senha incorreta. Tente novamente.');
            setLoading(false);
          }
        } else {
          setErrorMess('E-mail não cadastrado localmente. Por favor, crie uma nova conta.');
          setLoading(false);
        }
      } else if (mode === 'register') {
        if (!password || password.length < 3) {
          setErrorMess('A senha deve conter no mínimo 3 caracteres.');
          setLoading(false);
          return;
        }

        const exists = users.some((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        if (exists) {
          setErrorMess('Este e-mail já está em uso.');
          setLoading(false);
          return;
        }

        // Add new user
        const updatedUsers = [...users, { email: email.toLowerCase().trim(), password }];
        localStorage.setItem('vista_aerea_local_users', JSON.stringify(updatedUsers));
        setSuccessMess('Conta criada com sucesso! Redirecionando...');

        setTimeout(() => {
          onSuccess({ email: email.toLowerCase().trim() });
        }, 1200);
      } else if (mode === 'forgot') {
        const found = users.find((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        if (found) {
          setSuccessMess(`Instruções enviada! Sua senha de cadastro é: "${found.password}"`);
        } else {
          setErrorMess('E-mail não localizado no banco local.');
        }
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden select-text">
      {/* Background radial effects */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-slate-950 rounded-b-[100px] z-0 opacity-50" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="w-full max-w-sm z-10 space-y-6">
        {/* LOGO E TEXTO PRINCIPAL */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-2 bg-slate-950/40 rounded-2xl border border-sky-500/20 text-sky-400 relative overflow-hidden w-16 h-16 items-center justify-center">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-full h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
            ) : (
              <Compass size={32} className="text-sky-400" />
            )}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black uppercase tracking-wider text-white">Vista Aérea Drones</h1>
            <p className="text-xs text-slate-400 font-medium">Gestão de Orçamentos de Precisão</p>
          </div>
        </div>

        {/* CONTAINER DO FORMULÁRIO */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />

          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                    <ShieldCheck size={18} className="text-sky-400" />
                    <span>Acesse sua Conta</span>
                  </h3>
                  <p className="text-xs text-slate-400">Insira suas credenciais corporativas</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@empresa.com"
                        autoCorrect="on"
                        spellCheck={true}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Senha</label>
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot')}
                        className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {errorMess && (
                    <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start space-x-2 text-xs text-red-400">
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{errorMess}</span>
                    </div>
                  )}

                  {successMess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-start space-x-2 text-xs text-emerald-400">
                      <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{successMess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Acessar aplicativo</span>
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs text-slate-500">
                  <span>Não tem conta corporativa?</span>
                  <button
                    onClick={() => handleModeChange('register')}
                    className="text-sky-400 font-bold hover:underline cursor-pointer flex items-center"
                  >
                    Criar Conta
                    <ChevronRight size={12} className="ml-0.5" />
                  </button>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500">
                    Acesso rápido de teste:<br/>
                    <span className="text-sky-400 font-mono font-medium">demo@vistaereadrones.com.br</span> / <span className="text-sky-400 font-mono font-medium">123</span>
                  </p>
                </div>
              </motion.div>
            )}

            {mode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                    <UserPlus size={18} className="text-indigo-400" />
                    <span>Criar uma Nova Conta</span>
                  </h3>
                  <p className="text-xs text-slate-400">Cadastre suas credenciais localmente</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail corporativo</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contato@empresa.com"
                        autoCorrect="on"
                        spellCheck={true}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crie uma Senha</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="mínimo 3 caracteres"
                        className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {errorMess && (
                    <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start space-x-2 text-xs text-red-400">
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{errorMess}</span>
                    </div>
                  )}

                  {successMess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-start space-x-2 text-xs text-emerald-400">
                      <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{successMess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-600 hover:to-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Criar minha conta</span>
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs text-slate-500">
                  <span>Já é cadastrado?</span>
                  <button
                    onClick={() => handleModeChange('login')}
                    className="text-sky-400 font-bold hover:underline cursor-pointer flex items-center"
                  >
                    Fazer Login
                    <ChevronRight size={12} className="ml-0.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                    <Sparkles size={18} className="text-sky-400" />
                    <span>Esqueceu sua senha?</span>
                  </h3>
                  <p className="text-xs text-slate-400">Insira seu e-mail para recuperar as credenciais salvas localmente.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seu E-mail cadastrado</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@empresa.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  {errorMess && (
                    <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start space-x-2 text-xs text-red-400">
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{errorMess}</span>
                    </div>
                  )}

                  {successMess && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex flex-col items-start gap-1 text-xs text-emerald-400">
                      <div className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{successMess}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleModeChange('login')}
                      className="w-1/3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition shadow-sm cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Recuperar</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
