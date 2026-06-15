"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-in" | "fade-in-up" | "fade-in-down" | "zoom-in" | "slide-left" | "slide-right";
  delay?: number;
  duration?: number;
}

export default function ScrollReveal({
  children,
  className = "",
  animation = "fade-in-up",
  delay = 0,
  duration = 600,
}: ScrollRevealProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }

    // Fallback: automatically trigger animation after 400ms to guarantee visibility
    const fallbackTimer = setTimeout(() => {
      setIsIntersecting(true);
    }, 400);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          clearTimeout(fallbackTimer);
          // Once it has animated, we can disconnect to optimize performance
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px", // triggers slightly before entering viewport fully
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, []);

  const getAnimationStyles = () => {
    if (isMobile || typeof window === "undefined") {
      return {};
    }

    const baseTransition = `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
    
    let initialTransform = "";
    let activeTransform = "";

    switch (animation) {
      case "fade-in-up":
        initialTransform = "translateY(40px)";
        activeTransform = "translateY(0)";
        break;
      case "fade-in-down":
        initialTransform = "translateY(-40px)";
        activeTransform = "translateY(0)";
        break;
      case "zoom-in":
        initialTransform = "scale(0.92)";
        activeTransform = "scale(1)";
        break;
      case "slide-left":
        initialTransform = "translateX(50px)";
        activeTransform = "translateX(0)";
        break;
      case "slide-right":
        initialTransform = "translateX(-50px)";
        activeTransform = "translateX(0)";
        break;
      default:
        initialTransform = "none";
        activeTransform = "none";
    }

    return {
      opacity: isIntersecting ? 1 : 0,
      transform: isIntersecting ? activeTransform : initialTransform,
      transition: baseTransition,
    };
  };

  return (
    <div ref={ref} style={getAnimationStyles()} className={className}>
      {children}
    </div>
  );
}
