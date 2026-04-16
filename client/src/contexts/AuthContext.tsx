import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  empresaId: string | null;
  isAdmin: boolean;
  role: "admin" | "membro";
}

interface TrialInfo {
  planoStatus: string;
  diasRestantes: number | null;
  trialExpirado: boolean;
}

interface Empresa {
  id: string;
  nome: string;
  setor: string;
  tamanho: string;
  descricao?: string | null;
  planoTipo?: string | null;
  planoStatus?: string;
}

interface PlanoInfo {
  planoTipo: string;
  maxUsuarios: number | null;
  aiTier: string;
}

interface AuthContextType {
  user: Usuario | null;
  empresa: Empresa | null;
  trialInfo: TrialInfo | null;
  planoInfo: PlanoInfo | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}

interface RegisterData {
  nome: string;
  email: string;
  senha: string;
  nomeEmpresa: string;
  setor: string;
  tamanho: string;
  plano?: "start" | "pro";
}

export class AuthError extends Error {
  code?: string;
  email?: string;
  lockedUntil?: string;

  constructor(message: string, options?: { code?: string; email?: string; lockedUntil?: string }) {
    super(message);
    this.code = options?.code;
    this.email = options?.email;
    this.lockedUntil = options?.lockedUntil;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [planoInfo, setPlanoInfo] = useState<PlanoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) {
          setUser(data.usuario);
          setEmpresa(data.empresa);
          setTrialInfo(data.trialInfo ?? null);
          setPlanoInfo(data.planoInfo ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, senha: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new AuthError(data.error || "Erro ao fazer login", {
        code: data.code,
        email: data.email,
        lockedUntil: data.lockedUntil,
      });
    }
    const data = await res.json();
    setUser(data.usuario);
    setEmpresa(data.empresa);
    setTrialInfo(data.trialInfo ?? null);
    setPlanoInfo(data.planoInfo ?? null);
    queryClient.clear();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setEmpresa(null);
    setTrialInfo(null);
    setPlanoInfo(null);
    queryClient.clear();
    navigate("/login");
  };

  const register = async (formData: RegisterData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new AuthError(data.error || "Erro ao criar conta");
    }
    navigate("/verify-email");
  };

  return (
    <AuthContext.Provider value={{ user, empresa, trialInfo, planoInfo, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
