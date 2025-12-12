import {
  Inter,
  Tajawal,
  Almarai,
  Reem_Kufi,
  Be_Vietnam_Pro,
  Inria_Serif,
  Eczar,
} from "next/font/google";
import localFont from "next/font/local";

export const geist = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  display: "swap",
});

export const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  display: "swap",
});

export const reemKufi = Reem_Kufi({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const inriaSerif = Inria_Serif({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const eczar = Eczar({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const whyteInktrap = localFont({
  src: [
    {
      path: "../public/fonts/WhyteInktrap-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/WhyteInktrap-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/WhyteInktrap-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/WhyteInktrap-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-whyte-inktrap",
  display: "swap",
});
