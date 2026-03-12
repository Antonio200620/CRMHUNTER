/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { geminiService } from './services/geminiService';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  FileUp, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Send,
  X,
  Building2,
  Globe,
  MapPin,
  Maximize2,
  Menu,
  LogOut,
  Lock,
  Trash2,
  Edit2,
  Eye,
  Check,
  ListTodo,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { supabaseService } from './services/supabaseService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface Stage {
  id: number;
  name: string;
  color: string;
  order: number;
}

interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  segment: string;
  location: string;
  size: string;
  cnpj: string;
  stage_id: number;
  priority: 'High' | 'Medium' | 'Low';
  created_at: string;
  updated_at: string;
  last_interaction: string;
  stage_name?: string;
}

interface Interaction {
  id: number;
  lead_id: number;
  type: string;
  content: string;
  created_at: string;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, settings, user }: { activeTab: string, setActiveTab: (t: string) => void, isOpen: boolean, onClose: () => void, settings: any, user: any }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'pipeline', icon: Kanban, label: 'Pipeline' },
    { id: 'leads', icon: Users, label: 'Leads' },
    { id: 'reports', icon: BarChart, label: 'Relatórios' },
    { id: 'import', icon: FileUp, label: 'Importar' },
    { id: 'profile', icon: Users, label: 'Meu Perfil' },
    { id: 'settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen z-50 lg:translate-x-0 lg:static",
          !isOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Zap className="text-white w-5 h-5 fill-current" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight truncate max-w-[140px]">{settings.company_name || 'HunterAI'}</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-zinc-800 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  activeTab === item.id ? "text-emerald-400" : "group-hover:text-emerald-400"
                )} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
              <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.role === 'admin' ? 'Administrador' : 'Hunter Senior'}</p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

const Login = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        await supabaseService.register(email, password, name);
        setIsRegister(false);
        setError('Conta criada! Agora faça login.');
      } else {
        const { user } = await supabaseService.login(email, password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Erro na operação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <Zap className="text-white w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isRegister ? 'Criar Conta HunterAI' : 'Bem-vindo ao HunterAI'}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {isRegister ? 'Preencha os dados abaixo' : 'Entre para gerenciar seu pipeline'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nome Completo</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Seu Nome"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className={cn(
              "p-3 border rounded-xl flex items-center gap-2 text-sm",
              error.includes('sucesso') || error.includes('criada') 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            )}>
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              isRegister ? 'Criar Minha Conta' : 'Entrar no Sistema'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors"
          >
            {isRegister ? 'Já tenho uma conta. Entrar' : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          HunterAI CRM v2.0 • Inteligência em Vendas
        </p>
      </motion.div>
    </div>
  );
};

const LeadForm = ({ 
  lead, 
  stages, 
  onClose, 
  onSave 
}: { 
  lead?: Lead | null, 
  stages: Stage[], 
  onClose: () => void, 
  onSave: (data: any) => void 
}) => {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    company: lead?.company || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    website: lead?.website || '',
    segment: lead?.segment || '',
    location: lead?.location || '',
    size: lead?.size || '',
    cnpj: lead?.cnpj || '',
    stage_id: lead?.stage_id || stages[0]?.id || 1,
    priority: lead?.priority || 'Medium',
    comment: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{lead ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-all">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nome do Contato *</label>
              <input 
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Empresa *</label>
              <input 
                required
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="Ex: Ambev"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">E-mail</label>
              <input 
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="joao@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Telefone</label>
              <input 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Website</label>
              <input 
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="www.empresa.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Segmento</label>
              <input 
                value={formData.segment}
                onChange={e => setFormData({ ...formData, segment: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="Ex: Tecnologia"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Localização</label>
              <input 
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="Ex: São Paulo, SP"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">CNPJ</label>
              <input 
                value={formData.cnpj}
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Estágio</label>
              <select 
                value={formData.stage_id}
                onChange={e => setFormData({ ...formData, stage_id: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridade</label>
              <select 
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="Low">Baixa</option>
                <option value="Medium">Média</option>
                <option value="High">Alta</option>
              </select>
            </div>
          </div>

          {!lead && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Comentário Inicial</label>
              <textarea 
                value={formData.comment}
                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none h-24 resize-none"
                placeholder="Ex: Lead vindo de indicação, focar em diagnóstico técnico."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              {lead ? 'Salvar Alterações' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ stats, onUpdate }: { stats: any, onUpdate: () => void }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  if (!stats) return <div className="p-8 text-zinc-400">Carregando...</div>;

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

  const handleSaveEdit = async (id: number) => {
    await fetch(`/api/interactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent })
    });
    setEditingId(null);
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/interactions/${id}`, { method: 'DELETE' });
    setIsDeleting(null);
    onUpdate();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Performance Comercial</h1>
          <p className="text-zinc-400 mt-1">Visão geral do seu funil de vendas em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-zinc-300">Tempo Real Ativo</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Leads', value: stats.totalLeads, change: 'Total', icon: Users, color: 'text-emerald-400' },
          { label: 'Taxa de Conversão', value: stats.conversionRate, change: 'Geral', icon: Zap, color: 'text-blue-400' },
          { label: 'Tempo Médio', value: stats.avgTime, change: 'Ciclo', icon: Clock, color: 'text-indigo-400' },
          { label: 'Receita Estimada', value: stats.estimatedRevenue, change: 'Pipeline', icon: ArrowUpRight, color: 'text-amber-400' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg bg-zinc-800", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-zinc-400 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Pipeline por Estágio</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.stageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Distribuição</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.stageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {stats.stageDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats.stageDistribution.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-zinc-400">{entry.name}</span>
                </div>
                <span className="text-white font-medium">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Atividade em Tempo Real</h3>
          </div>
          <button onClick={onUpdate} className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Atualizar agora
          </button>
        </div>
        <div className="divide-y divide-zinc-800">
          {stats.recentInteractions?.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-500">Nenhuma atividade recente encontrada.</p>
            </div>
          ) : (
            stats.recentInteractions?.map((activity: any) => (
              <div key={activity.id} className="p-4 hover:bg-zinc-800/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="mt-1">
                      {activity.type === 'note' ? <MessageSquare className="w-4 h-4 text-blue-400" /> :
                       activity.type === 'call' ? <Phone className="w-4 h-4 text-emerald-400" /> :
                       activity.type === 'email' ? <Mail className="w-4 h-4 text-amber-400" /> :
                       <Zap className="w-4 h-4 text-zinc-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{activity.lead_name}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider px-1.5 py-0.5 bg-zinc-800 rounded">
                          {activity.type}
                        </span>
                      </div>
                      {editingId === activity.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea 
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none h-20 resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500 hover:text-white">Cancelar</button>
                            <button onClick={() => handleSaveEdit(activity.id)} className="text-xs text-emerald-400 font-bold">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 leading-relaxed">{activity.content}</p>
                      )}
                      <p className="text-[10px] text-zinc-600 mt-2">
                        {format(new Date(activity.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isDeleting === activity.id ? (
                      <div className="flex items-center gap-2 bg-zinc-800 px-2 py-1 rounded-lg">
                        <span className="text-[10px] text-zinc-500">Excluir?</span>
                        <button onClick={() => handleDelete(activity.id)} className="text-[10px] text-red-400 font-bold">Sim</button>
                        <button onClick={() => setIsDeleting(null)} className="text-[10px] text-zinc-500">Não</button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setEditingId(activity.id); setEditContent(activity.content); }}
                          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setIsDeleting(activity.id)}
                          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const LeadsList = ({ 
  leads, 
  stages, 
  onSelectLead, 
  onEditLead, 
  onDeleteLead, 
  onCreateLead 
}: { 
  leads: Lead[], 
  stages: Stage[], 
  onSelectLead: (lead: Lead) => void, 
  onEditLead: (lead: Lead) => void, 
  onDeleteLead: (id: number) => void, 
  onCreateLead: () => void 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Base de Leads</h1>
          <p className="text-zinc-500 text-sm">Gerencie todos os seus contatos em um só lugar.</p>
        </div>
        <button 
          onClick={onCreateLead}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar por nome, empresa ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/30">
                <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Lead</th>
                <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Empresa</th>
                <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Estágio</th>
                <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Prioridade</th>
                <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Última Interação</th>
                <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredLeads.length > 0 ? (
                filteredLeads.map(lead => {
                  const stage = stages.find(s => s.id === lead.stage_id);
                  return (
                    <tr key={lead.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-emerald-500">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{lead.name}</p>
                            <p className="text-xs text-zinc-500">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-zinc-400">{lead.company || '-'}</p>
                        <p className="text-[10px] text-zinc-600">{lead.segment || '-'}</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-400">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color || '#52525b' }} />
                          {stage?.name || 'Sem estágio'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                          lead.priority === 'High' ? "bg-red-500/10 text-red-400" :
                          lead.priority === 'Medium' ? "bg-amber-500/10 text-amber-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        )}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-zinc-500">
                          {lead.last_interaction ? format(new Date(lead.last_interaction), "dd/MM/yyyy", { locale: ptBR }) : 'Nunca'}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onSelectLead(lead)}
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onEditLead(lead)}
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteLead(lead.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-400 font-medium">Nenhum lead encontrado</p>
                    <p className="text-xs text-zinc-500 mt-1">Tente ajustar sua busca ou adicione um novo lead.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Pipeline = ({ 
  stages, 
  leads, 
  onMoveLead, 
  onDeleteLead,
  onEditLead,
  onSelectLead,
  onCreateLead
}: { 
  stages: Stage[], 
  leads: Lead[], 
  onMoveLead: (id: number, stageId: number) => void, 
  onDeleteLead: (id: number) => void,
  onEditLead: (lead: Lead) => void,
  onSelectLead: (lead: Lead) => void,
  onCreateLead: () => void
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('leadId', leadId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    const leadId = Number(e.dataTransfer.getData('leadId'));
    if (leadId && stageId) {
      onMoveLead(leadId, stageId);
    }
    setDraggedLeadId(null);
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 lg:p-8 border-b border-zinc-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Pipeline de Vendas</h1>
          <p className="text-xs lg:text-sm text-zinc-500">Arraste os cards para atualizar o progresso.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar lead..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full lg:w-64"
            />

            {/* Search Results Dropdown (CRUD Hub) */}
            <AnimatePresence>
              {isSearchFocused && searchTerm.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[400px] flex flex-col"
                >
                  <div className="p-3 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Resultados da busca</p>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{filteredLeads.length}</span>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 divide-y divide-zinc-800/50">
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map(lead => (
                        <div key={lead.id} className="p-3 hover:bg-zinc-800/50 flex items-center justify-between group transition-colors">
                          <div 
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" 
                            onClick={() => onSelectLead(lead)}
                          >
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                              {lead.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{lead.name}</p>
                              <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {lead.company || 'Sem empresa'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => onEditLead(lead)}
                              className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onDeleteLead(lead.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Search className="w-6 h-6 text-zinc-600" />
                        </div>
                        <p className="text-sm text-zinc-400 font-medium">Nenhum lead encontrado</p>
                        <p className="text-xs text-zinc-500 mt-1 mb-4">Não encontramos resultados para "{searchTerm}"</p>
                        <button 
                          onClick={onCreateLead}
                          className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all"
                        >
                          Criar novo lead
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {filteredLeads.length > 0 && (
                    <div className="p-2 bg-zinc-950/50 border-t border-zinc-800">
                      <button 
                        onClick={onCreateLead}
                        className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        Criar novo lead
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={onCreateLead}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-4 lg:p-8">
        <div className="flex gap-4 lg:gap-6 h-full min-w-max">
          {stages.map((stage) => (
            <div 
              key={stage.id} 
              className="w-80 flex flex-col gap-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{stage.name}</h3>
                  <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                    {filteredLeads.filter(l => l.stage_id === stage.id).length}
                  </span>
                </div>
                <MoreVertical className="w-4 h-4 text-zinc-600 cursor-pointer" />
              </div>

              <div className={cn(
                "flex-1 bg-zinc-900/30 rounded-2xl p-2 border border-dashed border-zinc-800/50 space-y-3 min-h-[500px] transition-colors",
                draggedLeadId ? "border-emerald-500/30 bg-emerald-500/5" : ""
              )}>
                {filteredLeads.filter(l => l.stage_id === stage.id).map((lead) => (
                  <motion.div
                    layoutId={`lead-${lead.id}`}
                    key={lead.id}
                  >
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => onSelectLead(lead)}
                      className={cn(
                        "bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-sm hover:border-zinc-700 cursor-grab active:cursor-grabbing group transition-all relative",
                        draggedLeadId === lead.id ? "opacity-50 scale-95" : ""
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                          lead.priority === 'High' ? "bg-red-500/10 text-red-400" :
                          lead.priority === 'Medium' ? "bg-amber-500/10 text-amber-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        )}>
                          {lead.priority}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLead(lead);
                            }}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLead(lead.id);
                            }}
                            className="p-1 hover:bg-red-500/10 rounded text-zinc-500 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <MoreVertical className="w-4 h-4 text-zinc-500" />
                        </div>
                      </div>
                      <h4 className="text-white font-bold text-sm leading-tight mb-1">{lead.name}</h4>
                      <p className="text-zinc-500 text-xs mb-3 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {lead.company}
                      </p>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden">
                            <img src={`https://picsum.photos/seed/${lead.id}/20/20`} alt="" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-[10px]">3</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileView = ({ user, onUpdate }: { user: any, onUpdate: (u: any) => void }) => {
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const data = await supabaseService.updateProfile(user.id, { name });
      onUpdate({ ...user, name: data.name });
      setMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      setMessage('Erro ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
        <p className="text-zinc-500 mt-2">Gerencie suas informações pessoais</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-emerald-500/20 overflow-hidden">
            <img src="https://picsum.photos/seed/user/200/200" alt="Avatar" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-zinc-500">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">
              {user?.role === 'admin' ? 'Administrador' : 'Hunter Senior'}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nome de Exibição</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="Seu Nome"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">E-mail (Não pode ser alterado)</label>
            <input 
              type="email" 
              value={user?.email}
              disabled
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-500 cursor-not-allowed"
            />
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded-xl text-sm font-medium border",
              message.includes('sucesso') 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            )}>
              {message}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
};

const SettingsView = ({ stages, settings, onUpdate }: { stages: Stage[], settings: any, onUpdate: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', color: '#94a3b8', order: stages.length + 1 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState(settings.company_name || 'Minha Empresa CRM');
  const [currency, setCurrency] = useState(settings.currency || 'BRL');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setCompanyName(settings.company_name || 'Minha Empresa CRM');
    setCurrency(settings.currency || 'BRL');
  }, [settings]);

  const fetchHistory = useCallback(async () => {
    const data = await supabaseService.getQuickCommands();
    setCommandHistory(data);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAdd = async () => {
    if (!newStage.name) return;
    const nextOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) + 1 : 1;
    await supabaseService.createStage({
      ...newStage,
      order: nextOrder
    });
    setNewStage({ name: '', color: '#94a3b8', order: nextOrder + 1 });
    setIsAdding(false);
    onUpdate();
  };

  const handleMove = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = stages.findIndex(s => s.id === id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === stages.length - 1) return;

    const otherIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentStage = stages[currentIndex];
    const otherStage = stages[otherIndex];

    // Swap orders
    await Promise.all([
      supabaseService.updateStage(currentStage.id, { order: otherStage.order }),
      supabaseService.updateStage(otherStage.id, { order: currentStage.order })
    ]);

    onUpdate();
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await supabaseService.updateSettings({
        company_name: companyName,
        currency: currency
      });
      onUpdate();
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUpdate = async (id: number) => {
    await supabaseService.updateStage(id, editData);
    setEditingId(null);
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    try {
      await supabaseService.deleteStage(id);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir estágio');
    }
  };

  const handleDeleteHistory = async (id: number) => {
    await supabaseService.deleteQuickCommand(id);
    fetchHistory();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Configurações do Sistema</h1>
        <p className="text-zinc-400 mt-1">Gerencie seu pipeline, histórico de IA e preferências.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Pipeline Stages */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h3 className="text-lg font-bold text-white">Estágios do Pipeline</h3>
                <p className="text-xs text-zinc-500">Defina as etapas do seu processo de vendas.</p>
              </div>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Estágio
              </button>
            </div>

            <div className="divide-y divide-zinc-800">
              {stages.map((stage) => (
                <div key={stage.id} className="p-4 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                  {editingId === stage.id ? (
                    <div className="flex-1 flex items-center gap-3">
                      <input 
                        type="color" 
                        value={editData.color}
                        onChange={e => setEditData({ ...editData, color: e.target.value })}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white"
                      />
                      <input 
                        type="number"
                        value={editData.order}
                        onChange={e => setEditData({ ...editData, order: Number(e.target.value) })}
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white"
                      />
                      <button onClick={() => handleUpdate(stage.id)} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 text-zinc-500 hover:bg-zinc-500/10 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-3 h-10 rounded-full" style={{ backgroundColor: stage.color }} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{stage.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Ordem: {stage.order}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col gap-0.5 mr-2">
                          <button 
                            onClick={() => handleMove(stage.id, 'up')}
                            disabled={stages.indexOf(stage) === 0}
                            className="p-1 text-zinc-600 hover:text-white disabled:opacity-0 transition-all"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleMove(stage.id, 'down')}
                            disabled={stages.indexOf(stage) === stages.length - 1}
                            className="p-1 text-zinc-600 hover:text-white disabled:opacity-0 transition-all"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingId(stage.id);
                            setEditData({ name: stage.name, color: stage.color, order: stage.order });
                          }}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(stage.id)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {isAdding && (
                <div className="p-4 bg-zinc-800/20 flex items-center gap-4">
                  <input 
                    type="color" 
                    value={newStage.color}
                    onChange={e => setNewStage({ ...newStage, color: e.target.value })}
                    className="w-10 h-10 bg-transparent border-none cursor-pointer"
                  />
                  <input 
                    placeholder="Nome do estágio..."
                    value={newStage.name}
                    onChange={e => setNewStage({ ...newStage, name: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white"
                  />
                  <button onClick={handleAdd} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
                    Adicionar
                  </button>
                  <button onClick={() => setIsAdding(false)} className="text-zinc-500 text-sm font-bold">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Company Settings */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">Informações da Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome da Empresa</label>
                <input 
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Moeda Padrão</label>
                <select 
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              >
                {isSavingSettings && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isSavingSettings ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </div>
          </section>
        </div>

        {/* Quick Command History */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Histórico de Comandos
            </h3>
            <div className="space-y-4">
              {commandHistory.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhum comando recente.</p>
              ) : (
                commandHistory.map(cmd => (
                  <div key={cmd.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl group relative">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-medium text-white italic truncate max-w-[180px]">"{cmd.command}"</p>
                      <button 
                        onClick={() => handleDeleteHistory(cmd.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">{cmd.result}</p>
                    <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-600">
                      <span>Processado por IA</span>
                      <span>{format(new Date(cmd.created_at), "HH:mm - dd/MM")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ImportLeads = ({ onImport, stages }: { onImport: (leads: any[], filename: string) => void, stages: Stage[] }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<any>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchBatches = useCallback(async () => {
    const data = await supabaseService.getImportBatches();
    setBatches(data);
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleDeleteBatch = async (id: number) => {
    await supabaseService.deleteImportBatch(id);
    setDeletingId(null);
    fetchBatches();
  };

  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Find the first row that looks like a header (has multiple non-empty cells)
        const headerRowIndex = jsonRaw.findIndex(row => row.filter(cell => cell !== null && cell !== "").length >= 2);
        
        if (headerRowIndex !== -1) {
          const fileHeaders = jsonRaw[headerRowIndex].map(h => String(h || "").trim()).filter(h => h !== "");
          setHeaders(fileHeaders);
          
          // Call AI to map columns
          setIsProcessing(true);
          try {
            const aiMapping = await geminiService.mapSpreadsheetColumns(fileHeaders);
            setMapping(aiMapping);
          } catch (err: any) {
            console.error("AI Mapping failed", err);
            setError("A IA não conseguiu mapear as colunas automaticamente. Verifique sua chave de API ou tente novamente.");
            setMapping({});
          } finally {
            setIsProcessing(false);
          }
        } else {
          setError("Não foi possível encontrar cabeçalhos válidos nesta planilha.");
        }
      } catch (err) {
        console.error("File read error", err);
        setError("Erro ao ler o arquivo. Verifique se é um arquivo Excel ou CSV válido.");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    }
  });

  const [isImporting, setIsImporting] = useState(false);

  const handleConfirmImport = async () => {
    if (!file || !mapping) return;
    setIsImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get raw data to find header row
        const jsonRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const headerRowIndex = jsonRaw.findIndex(row => row.filter(cell => cell !== null && cell !== "").length >= 2);
        
        if (headerRowIndex === -1) throw new Error("No headers found");

        // Convert to objects starting from the header row
        const json = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex }) as any[];
        
        const formattedLeads = json.map(row => {
          const lead: any = {};
          Object.entries(mapping).forEach(([crmField, sheetHeader]) => {
            // Find the value even if there are slight variations in header naming or whitespace
            const actualHeader = Object.keys(row).find(k => k.trim() === (sheetHeader as string).trim());
            const value = actualHeader ? row[actualHeader] : null;
            
            if (crmField === 'stage') {
              const stageName = String(value || "").toLowerCase();
              const stage = stages.find(s => s.name.toLowerCase() === stageName);
              if (stage) {
                lead.stage_id = stage.id;
              }
            } else {
              lead[crmField] = value;
            }
          });
          return lead;
        }).filter(l => l.name); // Ensure name exists
        
        await onImport(formattedLeads, file.name);
        setFile(null);
        setMapping(null);
        setTimeout(fetchBatches, 1000);
      } catch (err) {
        console.error("Import failed", err);
        setError("Erro ao processar a planilha. Verifique o formato do arquivo.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Importação Inteligente</h1>
          <p className="text-zinc-400 mt-1">Arraste sua planilha e deixe nossa IA organizar tudo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!file ? (
            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[400px]",
                isDragActive ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
                <FileUp className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Solte sua planilha aqui</h3>
              <p className="text-zinc-500 text-center max-w-xs">Suporta .xlsx e .csv. Nossa IA identificará as colunas automaticamente.</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <FileUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Mapeamento Sugerido pela IA</h4>
                  </div>
                  
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm mb-4">
                      <AlertCircle className="w-5 h-5" />
                      <p>{error}</p>
                    </div>
                  )}

                  {isProcessing ? (
                    <div className="flex items-center gap-3 text-zinc-400 py-4">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Analisando estrutura da planilha...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {mapping && Object.entries(mapping).map(([crmField, sheetHeader]) => (
                        <div key={crmField} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-500 uppercase">{crmField}</span>
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                            <span className="text-sm text-white font-medium">{sheetHeader as string}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setFile(null)}
                    className="px-6 py-2 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmImport}
                    disabled={isProcessing || isImporting}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-8 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    {isImporting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {isImporting ? 'Importando...' : 'Confirmar Importação'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-500" />
              Histórico de Importação
            </h3>
            <div className="space-y-4">
              {batches.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhuma importação realizada.</p>
              ) : (
                batches.map(batch => (
                  <div key={batch.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl group relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white truncate max-w-[150px]">{batch.filename}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {deletingId === batch.id ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 rounded"
                            >
                              Confirmar
                            </button>
                            <button 
                              onClick={() => setDeletingId(null)}
                              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeletingId(batch.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{batch.lead_count} leads importados</span>
                      <span>{format(new Date(batch.created_at), "dd/MM/yy")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Reports = ({ reportData }: { reportData: any }) => {
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [reportName, setReportName] = useState('');

  const fetchSavedReports = useCallback(async () => {
    const data = await supabaseService.getSavedReports();
    setSavedReports(data);
  }, []);

  useEffect(() => {
    fetchSavedReports();
  }, [fetchSavedReports]);

  const handleSaveReport = async () => {
    if (!reportName) return;
    setIsSaving(true);
    await supabaseService.createSavedReport({
      name: reportName,
      description: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy")}`,
      config: reportData
    });
    setReportName('');
    setIsSaving(false);
    fetchSavedReports();
  };

  const handleDeleteReport = async (id: number) => {
    if (confirm('Excluir este relatório salvo?')) {
      await supabaseService.deleteSavedReport(id);
      fetchSavedReports();
    }
  };

  if (!reportData) return <div className="p-8 text-zinc-400">Carregando relatórios...</div>;

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Relatórios de Prospecção</h1>
          <p className="text-zinc-400 mt-1">Análise detalhada do desempenho mensal e segmentação.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Nome do relatório..." 
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 flex-1 sm:w-48"
          />
          <button 
            onClick={handleSaveReport}
            disabled={!reportName || isSaving}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Salvar Snapshot
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Prospecção Mensal</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.monthlyProspecting}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Distribuição por Segmento</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.segmentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {reportData.segmentBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">Empresas Prospectadas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950/50">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Segmento</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {reportData.companyTable.slice(0, 10).map((company: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-white font-medium">{company.company}</td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{company.segment || '-'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        {format(new Date(company.created_at), "dd/MM/yyyy")}
                      </td>
                    </tr>
                  ))}
                  {reportData.companyTable.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-zinc-500 text-sm">Nenhuma empresa prospectada ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Relatórios Salvos
            </h3>
            <div className="space-y-4">
              {savedReports.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhum relatório salvo.</p>
              ) : (
                savedReports.map(report => (
                  <div key={report.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl group relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <BarChart className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold text-white truncate max-w-[150px]">{report.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteReport(report.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mb-1">{report.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-600">
                      <span>Snapshot estático</span>
                      <span>{format(new Date(report.created_at), "dd/MM/yy")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeadDetail = ({ lead, stages, onClose, onUpdate, onEdit }: { lead: Lead, stages: Stage[], onClose: () => void, onUpdate: () => void, onEdit: (lead: Lead) => void }) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks'>('timeline');
  const [editingInteractionId, setEditingInteractionId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [confirmDeleteLead, setConfirmDeleteLead] = useState(false);
  const [confirmDeleteInteractionId, setConfirmDeleteInteractionId] = useState<number | null>(null);

  const fetchInteractions = useCallback(() => {
    supabaseService.getInteractions(lead.id)
      .then(setInteractions)
      .catch(err => console.error('Error fetching interactions:', err));
  }, [lead.id]);

  const fetchTasks = useCallback(() => {
    supabaseService.getTasks(lead.id)
      .then(setTasks)
      .catch(err => console.error('Error fetching tasks:', err));
  }, [lead.id]);

  useEffect(() => {
    fetchInteractions();
    fetchTasks();
  }, [fetchInteractions, fetchTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await supabaseService.createTask({ 
      lead_id: lead.id, 
      title: newTaskTitle, 
      due_date: newTaskDate || null 
    });
    setNewTaskTitle('');
    setNewTaskDate('');
    fetchTasks();
  };

  const toggleTask = async (id: number, completed: boolean) => {
    await supabaseService.updateTask(id, { completed: !completed });
    fetchTasks();
  };

  const deleteTask = async (id: number) => {
    await supabaseService.deleteTask(id);
    fetchTasks();
  };

  const handleDeleteLead = async () => {
    try {
      await supabaseService.deleteLead(lead.id);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const handleDeleteInteraction = async (id: number) => {
    try {
      await supabaseService.deleteInteraction(id);
      fetchInteractions();
      setConfirmDeleteInteractionId(null);
    } catch (err) {
      console.error('Error deleting interaction:', err);
    }
  };

  const handleStartEdit = (interaction: Interaction) => {
    setEditingInteractionId(interaction.id);
    setEditContent(interaction.content);
  };

  const handleSaveEdit = async (id: number) => {
    await supabaseService.updateInteraction(id, { content: editContent });
    setEditingInteractionId(null);
    fetchInteractions();
  };

  const handleAddInteraction = async (type: string, content: string) => {
    await supabaseService.createInteraction({
      lead_id: lead.id,
      type,
      content
    });
    
    fetchInteractions();
  };

  const handleAISend = async () => {
    if (!newNote.trim()) return;
    setIsProcessing(true);
    try {
      // 1. Adiciona o comentário imediatamente
      await handleAddInteraction('note', newNote);
      
      // 2. Processa com IA para ver se há comandos (ex: mudar estágio)
      const result = await geminiService.processNaturalLanguage(newNote, lead.id);
      
      if (result.action === 'update_lead') {
        const updates: any = {};
        if (result.data.stage_name) {
          const stage = stages.find(s => s.name.toLowerCase() === result.data.stage_name.toLowerCase());
          if (stage) updates.stage_id = stage.id;
        }
        
        if (Object.keys(updates).length > 0) {
          await supabaseService.updateLead(lead.id, updates);
        }
      }
      
      setNewNote('');
      fetchInteractions();
      onUpdate();
    } catch (error: any) {
      console.error('AI Processing failed:', error);
      const errorMessage = error?.message || '';
      if (errorMessage.includes('API key') || errorMessage.includes('400')) {
        if ((window as any).aistudio) {
          if (confirm('Erro na chave de API do Gemini. Deseja selecionar uma nova chave?')) {
            (window as any).aistudio.openSelectKey();
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col"
    >
      <div className="p-4 lg:p-6 border-b border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">{lead.name}</h2>
            <p className="text-xs lg:text-sm text-zinc-500 truncate max-w-[200px] sm:max-w-none">{lead.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(lead)} className="p-2 hover:bg-zinc-900 rounded-xl transition-all">
            <Settings className="w-5 h-5 text-zinc-500 hover:text-white" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl transition-all">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Informações do Lead</h3>
            {confirmDeleteLead ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">Tem certeza?</span>
                <button onClick={handleDeleteLead} className="text-xs text-red-400 font-bold hover:underline">Sim</button>
                <button onClick={() => setConfirmDeleteLead(false)} className="text-xs text-zinc-500 hover:underline">Não</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteLead(true)} className="text-xs text-red-400 font-bold hover:underline">Excluir Lead</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl col-span-1 sm:col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Estágio Atual</p>
              <select 
                value={lead.stage_id}
                onChange={async (e) => {
                  const newStageId = Number(e.target.value);
                  await supabaseService.updateLead(lead.id, { stage_id: newStageId });
                  onUpdate();
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">E-mail</p>
              <p className="text-sm text-white truncate">{lead.email || '-'}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Telefone</p>
              <p className="text-sm text-white">{lead.phone || '-'}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Website</p>
              <p className="text-sm text-white truncate">{lead.website || '-'}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Localização</p>
              <p className="text-sm text-white">{lead.location || '-'}</p>
            </div>
          </div>
        </section>

        <div className="flex border-b border-zinc-800">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              activeTab === 'timeline' ? "border-emerald-500 text-white" : "border-transparent text-zinc-500"
            )}
          >
            Linha do Tempo
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              activeTab === 'tasks' ? "border-emerald-500 text-white" : "border-transparent text-zinc-500"
            )}
          >
            Tarefas ({tasks.length})
          </button>
        </div>

        {activeTab === 'timeline' ? (
          <section>
            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-zinc-800">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="relative pl-10 group/item">
                  <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{interaction.type}</span>
                        <span className="text-[10px] text-zinc-600">{format(new Date(interaction.created_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-60 group-hover/item:opacity-100 transition-opacity">
                        {confirmDeleteInteractionId === interaction.id ? (
                          <div className="flex items-center gap-2 bg-zinc-800 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-zinc-400">Excluir?</span>
                            <button onClick={() => handleDeleteInteraction(interaction.id)} className="text-[10px] text-red-400 font-bold">Sim</button>
                            <button onClick={() => setConfirmDeleteInteractionId(null)} className="text-[10px] text-zinc-500 font-bold">Não</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(interaction)} className="p-1 hover:text-white transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => setConfirmDeleteInteractionId(interaction.id)} className="p-1 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {editingInteractionId === interaction.id ? (
                      <div className="space-y-2">
                        <textarea 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none h-24"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingInteractionId(null)} className="text-xs text-zinc-500 font-bold">Cancelar</button>
                          <button onClick={() => handleSaveEdit(interaction.id)} className="text-xs text-emerald-400 font-bold">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{interaction.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <form onSubmit={handleAddTask} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nova Tarefa</label>
                <input 
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Enviar contrato assinado"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Data de Entrega</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="date"
                      value={newTaskDate}
                      onChange={e => setNewTaskDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="self-end bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all"
                >
                  Adicionar
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
                  <ListTodo className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Nenhuma tarefa pendente.</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 group">
                    <button 
                      onClick={() => toggleTask(task.id, task.completed)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        task.completed ? "bg-emerald-500 border-emerald-500" : "border-zinc-700 hover:border-emerald-500"
                      )}
                    >
                      {task.completed && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium transition-all",
                        task.completed ? "text-zinc-500 line-through" : "text-white"
                      )}>
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      <div className="p-4 lg:p-6 border-t border-zinc-800 bg-zinc-900/50">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: Phone, label: 'Ligar', type: 'call' },
            { icon: Mail, label: 'E-mail', type: 'email' },
            { icon: MessageSquare, label: 'WhatsApp', type: 'whatsapp' },
            { icon: Calendar, label: 'Reunião', type: 'meeting' },
          ].map(btn => (
            <button 
              key={btn.label}
              onClick={() => handleAddInteraction(btn.type, `Interação de ${btn.label} registrada.`)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-zinc-800 transition-all group"
            >
              <btn.icon className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400" />
              <span className="text-[9px] lg:text-[10px] text-zinc-500 group-hover:text-white font-medium">{btn.label}</span>
            </button>
          ))}
        </div>
        
        <div className="relative">
          <textarea 
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Digite um comentário ou comando (ex: 'Mudar para Proposta')"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none h-24"
          />
          <button 
            onClick={handleAISend}
            disabled={isProcessing || !newNote.trim()}
            className="absolute right-3 bottom-3 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
          <Zap className="w-3 h-3 fill-current" />
          A IA atualizará o estágio automaticamente se detectado.
        </p>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [quickCommand, setQuickCommand] = useState('');
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [settings, setSettings] = useState<any>({ company_name: 'Minha Empresa CRM', currency: 'BRL' });

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [stagesData, leadsData, settingsData] = await Promise.all([
        supabaseService.getStages(),
        supabaseService.getLeads(),
        supabaseService.getSettings()
      ]);
      
      const statsData = await supabaseService.getDashboardStats(leadsData, stagesData);
      // For reports, we can use a simplified version or fetch more data
      const reportData = {
        monthlyProspecting: [], // Simplified for now
        companyTable: leadsData.filter(l => l.company).map(l => ({ company: l.company, segment: l.segment, location: l.location, created_at: l.created_at })),
        segmentBreakdown: [] // Simplified
      };

      setStages(stagesData);
      setLeads(leadsData);
      setStats(statsData);
      setReportData(reportData);
      setSettings(settingsData);

      // Update selected lead if it exists to avoid stale data
      setSelectedLead(current => {
        if (!current) return null;
        const updated = leadsData.find((l: Lead) => l.id === current.id);
        if (!updated) return current;
        
        const hasChanged = JSON.stringify(updated) !== JSON.stringify(current);
        return hasChanged ? updated : current;
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleImport = async (importedLeads: any[], filename: string) => {
    try {
      const batch = await supabaseService.createImportBatch(filename, importedLeads.length);
      const batchId = batch.id;

      for (const lead of importedLeads) {
        await supabaseService.createLead({ ...lead, batch_id: batchId });
      }
      await fetchData();
      setActiveTab('leads');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleMoveLead = async (leadId: number, stageId: number) => {
    await supabaseService.updateLead(leadId, { stage_id: stageId });
    fetchData();
  };

  const handleDeleteLead = async (leadId: number) => {
    try {
      await supabaseService.deleteLead(leadId);
      fetchData();
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const handleSaveLead = async (data: any) => {
    if (leadToEdit) {
      await supabaseService.updateLead(leadToEdit.id, data);
    } else {
      await supabaseService.createLead(data);
    }
    
    setIsLeadFormOpen(false);
    setLeadToEdit(null);
    fetchData();
  };

  const [showCommandHistory, setShowCommandHistory] = useState(false);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);

  const fetchCommandHistory = useCallback(async () => {
    const data = await supabaseService.getQuickCommands();
    setCommandHistory(data);
  }, []);

  useEffect(() => {
    if (showCommandHistory) {
      fetchCommandHistory();
    }
  }, [showCommandHistory, fetchCommandHistory]);

  const handleQuickCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCommand.trim() || isProcessingCommand) return;

    const commandText = quickCommand.trim();
    setIsProcessingCommand(true);
    try {
      const result = await geminiService.processNaturalLanguage(commandText);
      let targetLead = null;

      // Try to find lead by query if no specific ID
      if (result.target_lead_query) {
        const query = result.target_lead_query.toLowerCase();
        targetLead = leads.find(l => 
          l.name.toLowerCase().includes(query) || 
          (l.company && l.company.toLowerCase().includes(query))
        );
      }

      let summary = result.data?.summary || "Comando processado";

      if (result.action === 'create_lead') {
        await supabaseService.createLead({
          ...result.data,
          comment: "Lead criado via comando: " + commandText
        });
        summary = `Lead "${result.data.name}" criado com sucesso.`;
      } else if (result.action === 'update_lead' && targetLead) {
        const updates: any = {};
        if (result.data.name) updates.name = result.data.name;
        if (result.data.company) updates.company = result.data.company;
        if (result.data.email) updates.email = result.data.email;
        if (result.data.phone) updates.phone = result.data.phone;
        
        if (result.data.stage_name) {
          const stage = stages.find(s => s.name.toLowerCase() === result.data.stage_name.toLowerCase());
          if (stage) updates.stage_id = stage.id;
        }

        await supabaseService.updateLead(targetLead.id, updates);

        // Add interaction note
        await supabaseService.createInteraction({
          lead_id: targetLead.id,
          type: 'note',
          content: result.data.summary || commandText
        });
        summary = `Lead "${targetLead.name}" atualizado: ${result.data.summary || 'dados alterados'}`;
      } else if (result.action === 'delete_lead' && targetLead) {
        await supabaseService.deleteLead(targetLead.id);
        if (selectedLead && targetLead.id === selectedLead.id) {
          setSelectedLead(null);
        }
        summary = `Lead "${targetLead.name}" excluído.`;
      } else if (result.action === 'search_lead' && targetLead) {
        setSelectedLead(targetLead);
        summary = `Lead "${targetLead.name}" localizado.`;
      } else if (targetLead) {
        // Default: add note
        await supabaseService.createInteraction({
          lead_id: targetLead.id,
          type: 'note',
          content: commandText
        });
        summary = `Nota adicionada ao lead "${targetLead.name}".`;
      } else {
        summary = "Não foi possível identificar o lead ou a ação desejada.";
      }
      
      // Save to history
      await supabaseService.createQuickCommand(commandText, summary);

      setQuickCommand('');
      fetchData();
    } catch (error: any) {
      console.error('AI Processing failed:', error);
      const errorMessage = error?.message || '';
      if (errorMessage.includes('API key') || errorMessage.includes('400')) {
        if ((window as any).aistudio) {
          if (confirm('Erro na chave de API do Gemini. Deseja selecionar uma nova chave?')) {
            (window as any).aistudio.openSelectKey();
          }
        } else {
          alert('Erro na chave de API do Gemini. Verifique as configurações.');
        }
      }
    } finally {
      setIsProcessingCommand(false);
    }
  };
  useEffect(() => {
  const handleResize = () => {
    const desktop = window.innerWidth >= 1024;
    setIsDesktop(desktop);
    setIsSidebarOpen(desktop);
  };

  handleResize();
  window.addEventListener('resize', handleResize);

  return () => window.removeEventListener('resize', handleResize);
}, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        settings={settings}
        user={user}
        isDesktop={isDesktop}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Zap className="text-white w-5 h-5 fill-current" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">HunterAI</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Dashboard stats={stats} onUpdate={fetchData} />
              </motion.div>
            )}
            
            {activeTab === 'pipeline' && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <Pipeline 
                  stages={stages} 
                  leads={leads} 
                  onMoveLead={handleMoveLead}
                  onDeleteLead={handleDeleteLead}
                  onEditLead={(lead) => {
                    setLeadToEdit(lead);
                    setIsLeadFormOpen(true);
                  }}
                  onSelectLead={setSelectedLead}
                  onCreateLead={() => {
                    setLeadToEdit(null);
                    setIsLeadFormOpen(true);
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'leads' && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <LeadsList 
                  leads={leads}
                  stages={stages}
                  onSelectLead={setSelectedLead}
                  onEditLead={(lead) => {
                    setLeadToEdit(lead);
                    setIsLeadFormOpen(true);
                  }}
                  onDeleteLead={handleDeleteLead}
                  onCreateLead={() => {
                    setLeadToEdit(null);
                    setIsLeadFormOpen(true);
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Reports reportData={reportData} />
              </motion.div>
            )}

            {activeTab === 'import' && (
              <motion.div
                key="import"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ImportLeads onImport={handleImport} stages={stages} />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ProfileView user={user} onUpdate={setUser} />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SettingsView stages={stages} settings={settings} onUpdate={fetchData} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <LeadDetail 
              lead={selectedLead} 
              stages={stages}
              onClose={() => setSelectedLead(null)} 
              onUpdate={fetchData}
              onEdit={(lead) => {
                setLeadToEdit(lead);
                setIsLeadFormOpen(true);
              }}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLeadFormOpen && (
          <LeadForm 
            lead={leadToEdit}
            stages={stages}
            onClose={() => {
              setIsLeadFormOpen(false);
              setLeadToEdit(null);
            }}
            onSave={handleSaveLead}
          />
        )}
      </AnimatePresence>

      {/* Quick Command Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30">
        <AnimatePresence>
          {showCommandHistory && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full mb-4 left-4 right-4 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-900/90 backdrop-blur-xl">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Comandos Recentes
                </h4>
                <button onClick={() => setShowCommandHistory(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-zinc-800">
                {commandHistory.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-sm italic">Nenhum comando recente</div>
                ) : (
                  commandHistory.map(cmd => (
                    <div key={cmd.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                      <p className="text-xs text-white font-medium italic mb-1">"{cmd.command}"</p>
                      <p className="text-[10px] text-zinc-500">{cmd.result}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form 
          onSubmit={handleQuickCommand}
          className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-2 rounded-2xl shadow-2xl flex items-center gap-2"
        >
          <button 
            type="button"
            onClick={() => setShowCommandHistory(!showCommandHistory)}
            className={cn(
              "p-2 rounded-xl transition-all",
              showCommandHistory ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            {isProcessingCommand ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-5 h-5 fill-current" />
            )}
          </button>
          <input 
            type="text" 
            value={quickCommand}
            onChange={(e) => setQuickCommand(e.target.value)}
            disabled={isProcessingCommand}
            placeholder="Comando rápido..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-zinc-500"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </form>
      </div>
    </div>
  );
}
