import React, { useEffect, useRef, useState } from 'react';

interface RevealOnScrollProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number; // delay in ms
  duration?: number; // duration in ms
  threshold?: number;
  className?: string;
  distance?: number; // distance in px to translate
  initiallyVisible?: boolean;
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 650,
  threshold = 0.1,
  className = '',
  distance = 24,
  initiallyVisible = false,
}) => {
  const [isRevealed, setIsRevealed] = useState(initiallyVisible);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsRevealed(true);
      return;
    }

    const currentEl = elementRef.current;
    if (currentEl) {
      // If element is already in initial viewport, reveal it immediately
      const rect = currentEl.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setIsRevealed(true);
        return;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsRevealed(true);
            if (elementRef.current) {
              observer.unobserve(elementRef.current);
            }
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [threshold]);

  const getTransform = () => {
    if (isRevealed) return 'translate3d(0, 0, 0)';
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'left':
        return `translate3d(${distance}px, 0, 0)`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0)`;
      case 'none':
      default:
        return 'translate3d(0, 0, 0)';
    }
  };

  return (
    <div
      ref={elementRef}
      className={`will-change-[transform,opacity] ${className}`}
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: getTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>
  );
};

