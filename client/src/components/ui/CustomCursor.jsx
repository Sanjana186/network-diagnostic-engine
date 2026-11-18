import React, { useEffect, useState, useRef } from 'react';

/**
 * CustomCursor Component
 * Renders a smooth, hardware-accelerated trailing circle that tracks mouse movement
 * and expands when hovering over interactive elements.
 */
export function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Position references for smooth interpolation
  const mousePos = useRef({ x: -100, y: -100 });
  const dotPos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    // Only enable custom cursor on non-touch desktop devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const onMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);

      // Check if hovering over an interactive element
      const target = e.target;
      const isInteractive = target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.classList.contains('cursor-pointer')
      );
      setHovering(Boolean(isInteractive));
    };

    const onMouseLeave = () => setVisible(false);
    const onMouseEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth animation loop using linear interpolation (LERP)
    const animate = () => {
      // Inner dot tracks immediately (0.9 lerp for instant lock)
      dotPos.current.x += (mousePos.current.x - dotPos.current.x) * 0.9;
      dotPos.current.y += (mousePos.current.y - dotPos.current.y) * 0.9;

      // Outer ring trails snappily behind (0.35 lerp for responsive tracking)
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.35;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.35;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-white pointer-events-none z-[9999] shadow-sm shadow-white/60"
        style={{ willChange: 'transform' }}
      />

      {/* Subtle Compact Trailing Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-[9998] transition-all duration-150 ease-out border ${
          hovering
            ? 'w-6 h-6 border-white/80 bg-white/10 shadow-md shadow-white/20'
            : 'w-4 h-4 border-white/40 bg-transparent'
        }`}
        style={{ willChange: 'transform' }}
      />
    </>
  );
}

export default CustomCursor;
