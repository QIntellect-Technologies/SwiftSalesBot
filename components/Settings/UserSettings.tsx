
import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Bell, Monitor, Database, Activity, 
  ChevronRight, Save, RotateCcw, Download, Upload, 
  Mail, Phone, Briefcase, Building, Key, Smartphone,
  Globe, Clock, Moon, Sun, Layout, Languages,
  Calendar, CreditCard, LogOut, CheckCircle2,
  AlertTriangle, Eye, EyeOff, MoreVertical, Trash2,
  Lock, ShieldCheck, Zap, Info, Terminal, Settings as SettingsIcon
} from 'lucide-react';
import { MOCK_USER_SETTINGS, MOCK_SESSIONS } from '../../constants';
import { UserSettings as UserSettingsType, UserSession } from '../../types';

const UserSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Profile');
  const [settings, setSettings] = useState<UserSettingsType>(MOCK_USER_SETTINGS);
  const [isModified, setIsModified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const tabs = [
    { name: 'Profile', icon: User, badge: null },
    { name: 'Security', icon: Shield, badge: '!' },
    { name: 'Notifications', icon: Bell, badge: null },
    { name: 'Appearance', icon: Monitor, badge: null },
    { name: 'Data & Export', icon: Database, badge: null },
    { name: 'System', icon: SettingsIcon, badge: null },
    { name: 'Audit Log', icon: Activity, badge: null }
  ];

  const handleSettingChange = (section: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value
      }
    }));
    setIsModified(true);
  };

  const handleSave = () => {
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      setIsModified(false);
      // Logic for toast could go here
    }, 1200);
  };

  const renderProfileTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="glass p-10 rounded-[40px] border dark:border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <User size={240} className="text-blue-500" />
            </div>
            
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
              <Info size={14} className="text-blue-500" /> Personal Identity Node
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    value={settings.profile.fullName}
                    onChange={(e) => handleSettingChange('profile', 'fullName', e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-[22px] border border-slate-100 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Email Uplink</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input 
                    type="email" 
                    value={settings.profile.email}
                    onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-[22px] border border-slate-100 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Access Terminal</label>
                <div className="relative group">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input 
                    type="tel" 
                    value={settings.profile.phone}
                    onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-[22px] border border-slate-100 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Department</label>
                <div className="relative group">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <select 
                    value={settings.profile.department}
                    onChange={(e) => handleSettingChange('profile', 'department', e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-[22px] border border-slate-100 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white appearance-none cursor-pointer"
                  >
                    <option>Operations</option>
                    <option>Management</option>
                    <option>Procurement</option>
                    <option>Sales</option>
                    <option>IT Hub</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Professional Abstract (Bio)</label>
                <textarea 
                  rows={4}
                  value={settings.profile.bio}
                  onChange={(e) => handleSettingChange('profile', 'bio', e.target.value)}
                  className="w-full p-6 rounded-[32px] border border-slate-100 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white resize-none shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[40px] border dark:border-white/5 text-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Node Avatar</h3>
            <div className="relative inline-block group">
              <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl relative">
                <img src={settings.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                  <Upload size={24} className="text-white animate-bounce" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">EMP_ID: {settings.profile.employeeId}</p>
            <button className="w-full mt-8 py-4 rounded-[22px] border border-slate-100 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all hover:bg-white dark:hover:bg-white/5">Update Biometric Visual</button>
          </div>

          <div className="glass p-8 rounded-[40px] border dark:border-white/5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Permission Schema</h3>
            <div className="space-y-4">
              {[
                { l: 'Auth Level', v: settings.profile.role, c: 'blue' },
                { l: 'Status', v: 'Verified Active', c: 'emerald' },
                { l: 'Node Rank', v: 'Commander L3', c: 'indigo' }
              ].map(p => (
                <div key={p.l} className="flex justify-between items-center p-4 rounded-[22px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{p.l}</span>
                  <span className={`text-[10px] font-black text-${p.c}-600 dark:text-${p.c}-400 uppercase`}>{p.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="glass p-10 rounded-[40px] border dark:border-white/5">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <Lock size={14} className="text-rose-500" /> Credential Encryption
              </h3>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">High Entropy</span>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[32px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Key size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Main Protocol Password</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Last cycle update: {settings.security.lastPasswordChange}</p>
                  </div>
                </div>
                <button className="px-8 py-3.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Cycle Key</button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[32px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 ${settings.security.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'} rounded-2xl flex items-center justify-center shadow-sm`}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Multi-Factor Authentication</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Status: {settings.security.twoFactorEnabled ? 'ENCRYPTED' : 'VULNERABLE'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all">Backup Keys</button>
                  <button className={`px-8 py-3.5 rounded-2xl ${settings.security.twoFactorEnabled ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20'} text-[10px] font-black uppercase tracking-widest transition-all`}>
                    {settings.security.twoFactorEnabled ? 'Deactivate' : 'Initialize'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-10 rounded-[40px] border dark:border-white/5 overflow-hidden">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
              <Smartphone size={14} className="text-blue-500" /> Active Session Registry
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                  <tr>
                    <th className="pb-6">Access Device</th>
                    <th className="pb-6">Territory</th>
                    <th className="pb-6">Logic Trace (IP)</th>
                    <th className="pb-6 text-right">Sequence Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {MOCK_SESSIONS.map(session => (
                    <tr key={session.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      <td className="py-6">
                        <div className="text-xs font-black text-slate-800 dark:text-white uppercase">{session.device}</div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{session.loginTime}</p>
                      </td>
                      <td className="py-6 text-[10px] font-bold text-slate-500 uppercase">{session.location}</td>
                      <td className="py-6 text-[10px] font-mono text-blue-500">{session.ip}</td>
                      <td className="py-6 text-right">
                        {session.status === 'Current' ? (
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-lg">LIVE_NODE</span>
                        ) : (
                          <button className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"><LogOut size={16} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="w-full mt-10 py-5 rounded-[28px] bg-slate-950 dark:bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Purge All Other Nodes</button>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="glass p-8 rounded-[40px] border border-amber-500/20 bg-amber-500/5">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Security Alert</h3>
             </div>
             <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-wide">Credential node hasn't been cycled in <span className="text-amber-600 font-black">156 days</span>. Security policy recommends a rotate every 90 days to maintain high entropy protocols.</p>
             <button className="w-full mt-8 py-4 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-[1.05] transition-all">Initialize Rotation</button>
           </div>

           <div className="glass p-8 rounded-[40px] border dark:border-white/5">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Node Visibility</h3>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-500 uppercase">Public Discovery</p>
                   <div className="w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-800 p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                   </div>
                </div>
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-500 uppercase">Audit Visibility</p>
                   <div className="w-12 h-6 rounded-full bg-blue-600 p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                   </div>
                </div>
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-500 uppercase">Telemetry Share</p>
                   <div className="w-12 h-6 rounded-full bg-blue-600 p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                   </div>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32 relative">
      
      {/* 1. Dynamic Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
        <div className="flex-1">
          <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 animate-pulse-slow">
              <SettingsIcon size={32} />
            </div>
            Command Center
          </h1>
          <nav className="flex items-center gap-2 mt-6 ml-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Logistics Terminal</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">User Protocol Configuration</span>
          </nav>
        </div>

        {/* Profile Summary Node */}
        <div className="glass p-6 rounded-[32px] border dark:border-white/5 flex items-center gap-6 max-w-lg w-full group overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
          <div className="w-16 h-16 rounded-[22px] border-2 border-blue-500/20 overflow-hidden shrink-0 shadow-lg relative z-10">
            <img src={settings.profile.avatarUrl} alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{settings.profile.fullName}</h2>
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/30">Super Admin</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{settings.profile.email}</p>
          </div>
          <div className="flex flex-col items-end gap-2 relative z-10">
             <div className="flex items-center gap-1.5 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
               Live Node
             </div>
             <button className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-500 transition-all"><LogOut size={16} /></button>
          </div>
        </div>
      </div>

      {/* 2. Global Protocol Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-100/40 dark:bg-white/5 p-8 rounded-[48px] border border-slate-200/50 dark:border-white/5 shadow-inner">
         <div className="flex bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-[24px] border border-slate-200/50 dark:border-white/10 shadow-sm overflow-x-auto no-scrollbar">
            {tabs.map(t => (
              <button
                key={t.name}
                onClick={() => setActiveTab(t.name)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[18px] transition-all duration-500 shrink-0 ${
                  activeTab === t.name 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <t.icon size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
                {t.badge && (
                  <span className="w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-black">{t.badge}</span>
                )}
              </button>
            ))}
         </div>

         <div className="flex items-center gap-4">
           <button className="p-4 rounded-[24px] bg-white dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-rose-500/20"><RotateCcw size={20} /></button>
           <button 
            onClick={handleSave}
            disabled={!isModified || saveLoading}
            className={`flex items-center gap-3 px-10 py-5 rounded-[32px] text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${
              isModified 
                ? 'bg-blue-600 text-white shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] hover:scale-[1.02]' 
                : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
            }`}
           >
             {saveLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
             Commit Changes
           </button>
         </div>
      </div>

      {/* 3. Logic Modules */}
      <div className="min-h-[600px]">
        {activeTab === 'Profile' && renderProfileTab()}
        {activeTab === 'Security' && renderSecurityTab()}
        {activeTab !== 'Profile' && activeTab !== 'Security' && (
          <div className="flex flex-col items-center justify-center py-40 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[40px] flex items-center justify-center text-blue-600 mb-8">
              <Terminal size={48} className="animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Initializing Module: {activeTab}</h3>
            <p className="text-slate-400 dark:text-slate-500 font-bold max-w-sm mt-4 leading-relaxed uppercase text-[10px] tracking-widest">Constructing high-fidelity configuration interfaces for the selected system vertical...</p>
            <div className="mt-10 flex gap-4">
               <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
               <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-150"></div>
               <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-300"></div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .ease-out-back { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
};

const RefreshCw = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
    <path d="M21 3v5h-5"></path>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
    <path d="M3 21v-5h5"></path>
  </svg>
);

export default UserSettings;
