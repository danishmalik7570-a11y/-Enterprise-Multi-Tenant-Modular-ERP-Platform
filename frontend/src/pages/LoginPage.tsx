import React, { useState } from 'react';
import {
  Sparkles,
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
  Database,
  Cpu
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export const LoginPage: React.FC = () => {
  const { login, availableTenants } = useTenant();

  const [subdomain, setSubdomain] = useState<string>('apex-retail');
  const [email, setEmail] = useState<string>('admin@apexretail.com');
  const [password, setPassword] = useState<string>('ApexPass123!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !subdomain) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password, subdomain);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoSub: string, demoEmail: string, demoPass: string) => {
    setSubdomain(demoSub);
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setIsLoading(true);
    login(demoEmail, demoPass, demoSub)
      .catch((err) => {
        setErrorMessage(err.message || 'Login failed.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const activeTenantObj = availableTenants.find(t => t.subdomain === subdomain);

  return (
    <div className="min-h-screen w-screen bg-slate-50 flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* Left Column: Brand Hero Area */}
      <div className="lg:w-1/2 bg-[#1A1A2E] text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1E5FBF]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1E5FBF]/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

        {/* Brand Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1E5FBF] flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">NEXUS // ERP</h1>
              <p className="text-[10px] text-[#BFDBFE] font-bold uppercase tracking-wider">
                Universal Multi-Business Enterprise Suite
              </p>
            </div>
          </div>
        </div>

        {/* Center Presentation */}
        <div className="relative z-10 my-12 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E5FBF]/30 border border-[#1E5FBF]/50 text-[#BFDBFE] text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Multi-Tenant Partitioned Architecture</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            One Core Engine. <br />
            <span className="text-[#38BDF8]">Every Business Model.</span>
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Run retail distributors, consulting retainers, light manufacturing, or service firms without custom builds. Fully configurable permissions, universal chart of accounts, and dynamic document builders.
          </p>

          {/* Key Architecture Features */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[#38BDF8] text-xs font-bold mb-1">
                <Database className="w-4 h-4" />
                <span>Strict Isolation</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Subdomain-scoped queries prevent cross-tenant data leaks.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[#38BDF8] text-xs font-bold mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Standardized in Rs.</span>
              </div>
              <p className="text-[11px] text-slate-400">
                End-to-end support for Rupees across all ledger accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-white/10 text-xs text-slate-400 flex items-center justify-between">
          <span>Nexus ERP v2.4 • Production Ready</span>
          <span className="font-mono text-[11px] text-slate-400">Django + DRF + FastAPI</span>
        </div>
      </div>

      {/* Right Column: Interactive Login Panel Form */}
      <div className="lg:w-1/2 bg-white flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-black text-navy tracking-tight">Sign In to Your Workspace</h2>
            <p className="text-xs text-navy-muted mt-1">
              Select your company subdomain and enter your authorized credentials.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant / Subdomain Selector */}
            <div>
              <label className="text-xs font-bold text-navy mb-1.5 flex items-center justify-between">
                <span>Tenant Organization</span>
                <span className="text-[11px] font-mono text-[#1E5FBF]">
                  Currency: {activeTenantObj?.currency || 'Rs.'}
                </span>
              </label>


              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value);
                    if (e.target.value === 'apex-retail') {
                      setEmail('admin@apexretail.com');
                      setPassword('ApexPass123!');
                    } else {
                      setEmail('partner@nexusadvisory.com');
                      setPassword('NexusPass123!');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:bg-white focus:border-[#1E5FBF] focus:ring-2 focus:ring-[#EAF2FF] transition-all cursor-pointer"
                >
                  <option value="apex-retail">Apex Retail Gear (Retail & Distribution) — apex-retail</option>
                  <option value="nexus-advisory">Nexus Advisory Group (Services & Consulting) — nexus-advisory</option>
                </select>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1E5FBF] focus:ring-2 focus:ring-[#EAF2FF] transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1E5FBF] focus:ring-2 focus:ring-[#EAF2FF] transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-navy absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Help */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-navy font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#1E5FBF] focus:ring-[#1E5FBF]"
                />
                <span>Remember this workstation</span>
              </label>

              <span className="text-slate-400 text-[11px]">Forgot password?</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#1E5FBF] hover:bg-[#184E9E] text-white font-bold text-xs rounded-xl shadow-subtle hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to ERP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo One-Click Access */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-navy uppercase tracking-wider">
                Quick 1-Click Demo Accounts
              </span>
              <span className="text-[10px] font-bold text-[#1E5FBF] bg-[#EAF2FF] px-2 py-0.5 rounded">
                Pre-Configured
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('apex-retail', 'admin@apexretail.com', 'ApexPass123!')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-[#1E5FBF] hover:bg-[#EAF2FF]/50 transition-all flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-navy group-hover:text-[#1E5FBF]">
                      Apex Retail Gear — Owner Role
                    </span>
                    <span className="text-[10px] font-mono px-1.5 rounded bg-slate-100 text-slate-600">Full Access</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">admin@apexretail.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E5FBF] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('apex-retail', 'sales@apexretail.com', 'ApexPass123!')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-[#1E5FBF] hover:bg-[#EAF2FF]/50 transition-all flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-navy group-hover:text-[#1E5FBF]">
                      Apex Retail Gear — Sales Role
                    </span>
                    <span className="text-[10px] font-mono px-1.5 rounded bg-slate-100 text-slate-600">Masks Cost Price</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">sales@apexretail.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E5FBF] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('apex-retail', 'warehouse@apexretail.com', 'ApexPass123!')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-[#1E5FBF] hover:bg-[#EAF2FF]/50 transition-all flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-navy group-hover:text-[#1E5FBF]">
                      Apex Retail Gear — Warehouse Role
                    </span>
                    <span className="text-[10px] font-mono px-1.5 rounded bg-slate-100 text-slate-600">Inventory Only</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">warehouse@apexretail.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E5FBF] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nexus-advisory', 'partner@nexusadvisory.com', 'NexusPass123!')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-[#1E5FBF] hover:bg-[#EAF2FF]/50 transition-all flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-navy group-hover:text-[#1E5FBF]">
                      Nexus Advisory — Partner Role
                    </span>
                    <span className="text-[10px] font-mono px-1.5 rounded bg-slate-100 text-slate-600">Services Firm</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">partner@nexusadvisory.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E5FBF] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nexus-advisory', 'finance@nexusadvisory.com', 'NexusPass123!')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-[#1E5FBF] hover:bg-[#EAF2FF]/50 transition-all flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-navy group-hover:text-[#1E5FBF]">
                      Nexus Advisory — Finance Role
                    </span>
                    <span className="text-[10px] font-mono px-1.5 rounded bg-slate-100 text-slate-600">Finance & P&L</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">finance@nexusadvisory.com</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1E5FBF] transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
