import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Mail,
  FileSpreadsheet,
  Layers,
  Search,
  Users,
  Lock,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { PromptifyMark } from '../common/PromptifyMark';
import { RevealOnScroll } from '../landing/RevealOnScroll';
import { AnimatedBrandWatermark } from '../landing/AnimatedBrandWatermark';

export const LandingLoginScreen: React.FC = () => {
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Real Google OAuth Flow - Exact Logic Preserved
  const handleRealGoogleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setLoginError(error.message);
        setIsLoggingIn(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Unable to connect to authentication server.');
      setIsLoggingIn(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500 selection:text-white flex flex-col overflow-x-hidden">
      {/* Dynamic Background Watermark Logo & Ambient Bloom */}
      <AnimatedBrandWatermark />

      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <PromptifyMark className="h-8 w-8 sm:h-9 sm:w-9" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-950 font-display">
                  Promptify
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Enterprise
                </span>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('problems')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              Key Challenges
            </button>
            <button
              onClick={() => scrollToSection('core-principles')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              Core Principles
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('practical-values')}
              className="hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
            >
              Business Impact
            </button>
          </nav>

          {/* Quick Login CTA */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRealGoogleLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 text-xs sm:text-sm font-semibold py-2 px-3.5 sm:px-4 rounded-xl transition-all duration-200 shadow-none hover:shadow-2xs cursor-pointer disabled:opacity-60 active:scale-[0.98]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoggingIn ? 'Connecting...' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1 relative z-10">
        
        {/* 2. HERO SECTION - 55/45 EDITORIAL LAYOUT */}
        <section className="pt-16 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 border-b border-slate-200/70 bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* LEFT COLUMN (55%): Headline, Subtitle, CTAs */}
              <div className="lg:col-span-7 space-y-7 animate-hero-fade">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs sm:text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Practical AI Skills for Enterprise Teams</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold tracking-tight text-slate-950 leading-[1.08] text-balance">
                    Master Practical AI Workflows at Work.
                  </h1>
                  <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl text-balance font-normal">
                    Practice with authentic business scenarios, receive instant automated evaluation, and build high-performing prompts — no technical background required.
                  </p>
                </div>

                {/* CTAs */}
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                    <button
                      type="button"
                      onClick={handleRealGoogleLogin}
                      disabled={isLoggingIn}
                      className="group inline-flex items-center justify-center gap-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base py-4 px-7 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>{isLoggingIn ? 'Connecting...' : 'Get Started with Google'}</span>
                      <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection('how-it-works')}
                      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base py-4 px-6 rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer shadow-2xs"
                    >
                      <span>Explore How It Works</span>
                    </button>
                  </div>

                  {loginError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold block">Sign In Failed:</span>
                        <span>{loginError}</span>
                      </div>
                      <button onClick={() => setLoginError(null)} className="text-rose-600 hover:text-rose-900 font-bold ml-1">✕</button>
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-slate-500 pt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Designed for office and business professionals. No coding or tech background needed.</span>
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN (45%): BRAND STATEMENT / EDITORIAL MANIFESTO */}
              <div className="lg:col-span-5 pt-6 lg:pt-0 animate-hero-fade">
                <div className="border-l-4 border-emerald-600 pl-6 sm:pl-9 py-3 space-y-4">
                  <p className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-slate-950 leading-[1.18] tracking-tight">
                    Don't just query AI.<br />
                    Learn how to{' '}
                    <span className="text-emerald-700 underline decoration-emerald-400 decoration-4 underline-offset-8">
                      collaborate with AI.
                    </span>
                  </p>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal pt-2">
                    Clear instructions. Controlled outputs. Verifiable business results.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. SECTION KEY CHALLENGES */}
        <section id="problems" className="py-20 sm:py-28 lg:py-32 bg-white border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 text-balance leading-snug">
                  Using AI Frequently Doesn't Mean Using AI Effectively.
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
                  Many professionals use conversational AI daily, but significant work hours are wasted rewriting ungrounded, generic, or off-target outputs.
                </p>
              </div>
            </RevealOnScroll>

            {/* 3 Challenges - Editorial Top Dividers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-2">
              <RevealOnScroll direction="up" delay={80}>
                <div className="border-t-2 border-slate-200 pt-6 space-y-3">
                  <span className="text-sm font-mono font-bold text-slate-400">01</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Inconsistent Results
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    The same business task yields wildly different answers every time — ranging from brilliant to unfocused, verbose, and off-point.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={180}>
                <div className="border-t-2 border-slate-200 pt-6 space-y-3">
                  <span className="text-sm font-mono font-bold text-slate-400">02</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Endless Rewriting Cycles
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Valuable time is lost back-and-forth because prompts lack explicit context, boundary constraints, and structured output formatting from the start.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={280}>
                <div className="border-t-2 border-slate-200 pt-6 space-y-3">
                  <span className="text-sm font-mono font-bold text-slate-400">03</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Blind Prompt Debugging
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    When output misses the mark, users guess random tweaks without understanding which prompt components were missing or broken.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 4. SECTION CORE PRINCIPLES */}
        <section id="core-principles" className="py-20 sm:py-28 lg:py-32 bg-emerald-50/30 border-b border-emerald-100/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="max-w-2xl space-y-3">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 leading-snug">
                  Three Pillars of Executive AI Collaboration
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  Learn to govern AI output with certainty, reliability, and precision across daily enterprise workflows.
                </p>
              </div>
            </RevealOnScroll>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              <RevealOnScroll direction="up" delay={100}>
                <div className="border-t-2 border-emerald-600 pt-6 space-y-3.5">
                  <span className="text-sm font-mono font-bold text-emerald-700">01</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Clear Task Delegation
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Direct the model with exact persona, business context, and explicit expectations for the final deliverables.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={200}>
                <div className="border-t-2 border-slate-300 hover:border-emerald-600 transition-colors duration-200 pt-6 space-y-3.5">
                  <span className="text-sm font-mono font-bold text-slate-400">02</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Output Control & Guardrails
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Use one-shot patterns, negative constraints, and structured formats to eliminate redundant back-and-forth.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={300}>
                <div className="border-t-2 border-slate-300 hover:border-emerald-600 transition-colors duration-200 pt-6 space-y-3.5">
                  <span className="text-sm font-mono font-bold text-slate-400">03</span>
                  <h3 className="text-xl font-bold text-slate-950">
                    Grounded in Truth
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Anchor model reasoning strictly in source documents, organizational policy, and verified enterprise data.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 5. SECTION HOW IT WORKS */}
        <section id="how-it-works" className="py-20 sm:py-28 lg:py-32 bg-white border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 text-balance leading-snug">
                  How Promptify Accelerates Your AI Fluency
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
                  Learn through deliberate practice: compose, execute against live LLMs, and refine with instant automated rubric feedback.
                </p>
              </div>
            </RevealOnScroll>

            {/* 3 Sequential Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <RevealOnScroll direction="up" delay={100}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 tracking-wide uppercase">First Step</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Draft Prompts for Real Business Scenarios
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Tackle authentic workplace documents, memos, emails, and data reports using your business domain knowledge.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={220}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 tracking-wide uppercase">Live Execution</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Execute with Live AI Models
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Submit directly to enterprise LLMs and observe real-time results against authentic business acceptance criteria.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={340}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center">
                      3
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 tracking-wide uppercase">Continuous Refinement</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Receive Feedback & Level Up
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Automated rubric scoring analyzes prompt structure, highlights key strengths, and gives targeted hints for immediate revision.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 6. SECTION BUSINESS IMPACT */}
        <section id="practical-values" className="py-20 sm:py-28 lg:py-32 bg-slate-50/70 border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
            <RevealOnScroll direction="up" delay={0}>
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-slate-950 text-balance leading-snug">
                  Immediate Value in Everyday Business Tasks
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
                  Turn generative AI capability into quantifiable productivity across core administrative and executive workflows.
                </p>
              </div>
            </RevealOnScroll>

            {/* 6 Work Use Cases */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              <RevealOnScroll direction="up" delay={50}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Email & Communications</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Draft diplomatic rebuttals, policy explanations, and executive stakeholder updates with precision.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={120}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Executive Reporting</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Consolidate multi-source inputs into clear, concise periodic performance and status reports.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={190}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Document Summarization</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Condense complex contracts, board minutes, and regulatory filings into key actionable takeaways.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={260}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Case & Request Triage</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Categorize customer feedback, compliance queries, and priority levels with high consistency.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={330}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Structured Data Extraction</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Extract unstructured narrative points into clean tables ready for spreadsheets and BI analysis.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll direction="up" delay={400}>
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Internal Policy Querying</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">Verify specific clauses and compliance rules against standard operating procedures.</p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* 7. SECTION FINAL CTA */}
        <section className="py-20 sm:py-28 lg:py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <RevealOnScroll direction="up" delay={50} duration={700}>
              <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 border-2 border-emerald-200/80 text-center space-y-7 shadow-xs">
                <div className="space-y-3 max-w-xl mx-auto">
                  <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-slate-950 leading-tight">
                    Start Collaborating with AI with Precision.
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                    Begin practicing today to make AI your most reliable, productive workplace co-pilot.
                  </p>
                </div>

                {/* Google CTA */}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleRealGoogleLogin}
                    disabled={isLoggingIn}
                    className="group inline-flex items-center justify-center gap-3.5 bg-white hover:bg-emerald-50 text-slate-950 font-bold text-base sm:text-lg py-4 px-8 rounded-xl border-2 border-emerald-600 shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isLoggingIn ? 'Redirecting to Google...' : 'Sign In with Google'}</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Secure, enterprise-grade internal training sandbox</span>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <footer className="relative z-10 border-t border-slate-200 py-10 px-4 sm:px-6 bg-slate-50 text-center text-sm text-slate-500">
        <p>
          Promptify © 2026 • Enterprise AI & Prompt Engineering Training Platform
        </p>
      </footer>
    </div>
  );
};
