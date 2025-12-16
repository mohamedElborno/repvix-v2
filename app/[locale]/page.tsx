"use client";
import { useEffect } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import FAQ from "@/components/sections/FAQ";
import Footer from "@/components/layout/Footer";
import { trackLpEvent } from "@/lib/lpTelemetry";

function useScroll50Event() {
  useEffect(() => {
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportHeight = window.innerHeight || 0;
      const docHeight =
        document.documentElement.scrollHeight || document.body.scrollHeight;

      if (docHeight === 0) return;

      const bottomPosition = scrollY + viewportHeight;
      if (bottomPosition >= docHeight * 0.5) {
        fired = true;
        trackLpEvent("home_scroll_50");
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

export default function Home() {
  useEffect(() => {
    trackLpEvent("home_view");
  }, []);

  useScroll50Event();

  return (
    <div className="antialiased bg-background">
      <div className="relative z-10">
        <SiteHeader />
        <Hero />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <Features />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <HowItWorks />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <Pricing />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <FAQ />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <Footer />
      </div>
    </div>
  );
}
