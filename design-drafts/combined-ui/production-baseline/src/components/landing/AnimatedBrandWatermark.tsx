import React, { useEffect, useState } from 'react';

export const AnimatedBrandWatermark: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    motionQuery.addEventListener('change', handleMotionChange);

    if (motionQuery.matches) {
      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
      };
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          const currentProgress = totalHeight > 0 ? Math.min(Math.max(window.scrollY / totalHeight, 0), 1) : 0;
          setScrollProgress(currentProgress);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Calculate smooth Canva-like parallax translations & rotations
  // Primary Mark: Starts top-right in Hero, drifts gracefully across sections
  const primaryTranslateY = reducedMotion ? 0 : scrollProgress * 380;
  const primaryTranslateX = reducedMotion ? 0 : -scrollProgress * 140;
  const primaryRotate = reducedMotion ? -4 : -6 + scrollProgress * 28;
  const primaryScale = reducedMotion ? 1 : 1 + scrollProgress * 0.12;

  // Secondary Mark: Anchored lower-left, subtle counter-drift
  const secondaryTranslateY = reducedMotion ? 0 : -scrollProgress * 220;
  const secondaryTranslateX = reducedMotion ? 0 : scrollProgress * 90;
  const secondaryRotate = reducedMotion ? 12 : 12 - scrollProgress * 22;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* 1. Primary Promptify Signature Watermark (Top-Right -> Mid-Right) */}
      <div
        className="absolute top-[8%] -right-16 sm:right-[2%] lg:right-[6%] w-[290px] h-[290px] sm:w-[380px] sm:h-[380px] lg:w-[480px] lg:h-[480px] opacity-[0.04] transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `translate3d(${primaryTranslateX}px, ${primaryTranslateY}px, 0) rotate(${primaryRotate}deg) scale(${primaryScale})`,
        }}
      >
        <img
          src="/brand/promptify-mark.png"
          alt=""
          className="w-full h-full object-contain filter grayscale-[20%]"
          loading="eager"
        />
      </div>

      {/* 2. Secondary Promptify Accent Watermark (Mid-Page -> Lower-Left) */}
      <div
        className="absolute top-[52%] -left-20 sm:left-[1%] lg:left-[4%] w-[220px] h-[220px] sm:w-[320px] sm:h-[320px] lg:w-[400px] lg:h-[400px] opacity-[0.03] transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `translate3d(${secondaryTranslateX}px, ${secondaryTranslateY}px, 0) rotate(${secondaryRotate}deg)`,
        }}
      >
        <img
          src="/brand/promptify-mark.png"
          alt=""
          className="w-full h-full object-contain filter grayscale-[10%]"
          loading="lazy"
        />
      </div>

      {/* 3. Subtle Ambient Light Bloom behind Hero (Emerald & Deep Navy glow) */}
      <div className="absolute top-[-80px] right-[10%] w-[500px] h-[400px] rounded-full bg-emerald-100/35 blur-3xl -z-10" />
      <div className="absolute top-[35%] -left-[100px] w-[450px] h-[450px] rounded-full bg-slate-200/30 blur-3xl -z-10" />
    </div>
  );
};

