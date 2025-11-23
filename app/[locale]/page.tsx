"use client";
import Plasma from "@/components/layout/plasma";
import { SiteHeader } from "@/components/layout/site-header";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import FAQ from "@/components/sections/FAQ";
import Footer from "@/components/layout/Footer";
import { usePathname } from "next/navigation";

export default function Home() {
  const pathname = usePathname();
  return (
    <div className="antialiased bg-black">
      <div className="hidden sm:block fixed inset-0 z-0 bg-black">
        <Plasma
          key={pathname || ""}
          color="#8b5cf6"
          speed={0.8}
          direction="forward"
          scale={1.5}
          opacity={0.4}
          mouseInteractive={true}
        />
      </div>
      <div className="relative z-10">
        <SiteHeader />
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <Footer />
      </div>
    </div>
  );
}
