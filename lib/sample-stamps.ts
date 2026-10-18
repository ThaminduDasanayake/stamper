export type SampleStamp = {
  id: string;
  name: string;
  category: string;
  svg: string;
  suggestedCountry: string;
  suggestedDenomination: string;
  suggestedPaper: string;
  suggestedInk: string;
};

export const SAMPLE_STAMPS: SampleStamp[] = [
  {
    id: "botanical-rose",
    name: "Heritage Rose",
    category: "Flora",
    suggestedCountry: "HELVETIA",
    suggestedDenomination: "50c",
    suggestedPaper: "#fcf8f0",
    suggestedInk: "#8a2832",
    svg: `<svg viewBox="0 0 300 375" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="300" height="375" fill="#f4ebd9"/>
      <rect x="12" y="12" width="276" height="351" fill="none" stroke="#8a2832" stroke-width="2" stroke-dasharray="4 2"/>
      <rect x="16" y="16" width="268" height="343" fill="none" stroke="#8a2832" stroke-width="1"/>
      <g fill="none" stroke="#8a2832" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <!-- Stem & leaves -->
        <path d="M150 290 Q 152 220 148 180" />
        <path d="M148 230 Q 110 220 100 240 Q 120 255 148 238" fill="#d7e5d8" />
        <path d="M149 205 Q 190 195 200 215 Q 180 230 149 213" fill="#d7e5d8" />
        <!-- Rose petals layered -->
        <path d="M148 180 Q 130 140 150 115 Q 170 140 148 180" fill="#f2b5be"/>
        <path d="M125 155 Q 120 125 145 110 Q 160 125 145 155 Z" fill="#eb8f9d"/>
        <path d="M175 155 Q 180 125 155 110 Q 140 125 155 155 Z" fill="#eb8f9d"/>
        <path d="M135 170 Q 110 150 120 135 Q 145 140 145 170 Z" fill="#e0697a"/>
        <path d="M165 170 Q 190 150 180 135 Q 155 140 155 170 Z" fill="#e0697a"/>
        <circle cx="150" cy="135" r="14" fill="#c43b4f"/>
        <circle cx="150" cy="135" r="7" fill="#8a2832"/>
      </g>
      <text x="150" y="335" font-family="serif" font-size="13" font-weight="bold" fill="#8a2832" letter-spacing="4" text-anchor="middle">ROSA GALLICA</text>
    </svg>`,
  },
  {
    id: "soaring-eagle",
    name: "Airmail Falcon",
    category: "Fauna",
    suggestedCountry: "AIR MAIL",
    suggestedDenomination: "25¢",
    suggestedPaper: "#f2f5f9",
    suggestedInk: "#1e3a5f",
    svg: `<svg viewBox="0 0 300 375" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="300" height="375" fill="#e8eff7"/>
      <rect x="12" y="12" width="276" height="351" fill="none" stroke="#1e3a5f" stroke-width="2"/>
      <rect x="16" y="16" width="268" height="343" fill="none" stroke="#1e3a5f" stroke-width="1" stroke-dasharray="3 3"/>
      <!-- Sun circle behind -->
      <circle cx="150" cy="160" r="70" fill="#fcedd2" stroke="#1e3a5f" stroke-width="1.5"/>
      <!-- Mountain ridges below -->
      <path d="M30 280 L 90 200 L 150 250 L 210 190 L 270 280 L 30 280 Z" fill="#c9d9eb" stroke="#1e3a5f" stroke-width="2"/>
      <path d="M70 280 L 120 220 L 170 280 Z" fill="#b1c8df" stroke="#1e3a5f" stroke-width="1.5"/>
      <!-- Eagle silhouette & wings -->
      <g fill="#1e3a5f" stroke="#1e3a5f" stroke-width="1.5" stroke-linejoin="round">
        <path d="M150 145 C 130 115 80 105 45 125 C 75 145 115 150 140 160 C 145 168 155 168 160 160 C 185 150 225 145 255 125 C 220 105 170 115 150 145 Z"/>
        <path d="M142 160 L 150 185 L 158 160 Z"/>
        <!-- Head -->
        <circle cx="150" cy="138" r="8" fill="#fcedd2"/>
        <path d="M150 134 Q 158 138 152 144 Z" fill="#d97706"/>
      </g>
      <text x="150" y="325" font-family="monospace" font-size="11" font-weight="bold" fill="#1e3a5f" letter-spacing="3" text-anchor="middle">FIRST CLASS POST</text>
    </svg>`,
  },
  {
    id: "lunar-voyage",
    name: "Cosmic Odyssey",
    category: "Space",
    suggestedCountry: "APOLLO",
    suggestedDenomination: "$1.00",
    suggestedPaper: "#1e1e24",
    suggestedInk: "#e5b869",
    svg: `<svg viewBox="0 0 300 375" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="300" height="375" fill="#15151c"/>
      <rect x="12" y="12" width="276" height="351" fill="none" stroke="#e5b869" stroke-width="2"/>
      <rect x="16" y="16" width="268" height="343" fill="none" stroke="#e5b869" stroke-width="1" stroke-opacity="0.5"/>
      <!-- Stars -->
      <g fill="#e5b869">
        <circle cx="50" cy="60" r="1.5"/>
        <circle cx="80" cy="95" r="1"/>
        <circle cx="230" cy="70" r="2"/>
        <circle cx="250" cy="130" r="1.5"/>
        <circle cx="70" cy="180" r="1.5"/>
        <circle cx="240" cy="220" r="1"/>
        <circle cx="110" cy="45" r="1"/>
      </g>
      <!-- Moon crescent -->
      <path d="M190 70 A 45 45 0 1 0 230 135 A 35 35 0 1 1 190 70 Z" fill="#e5b869"/>
      <!-- Rocket ship -->
      <g transform="translate(140, 160) rotate(-35)" fill="none" stroke="#e5b869" stroke-width="2.5" stroke-linecap="round">
        <path d="M0 -50 Q 18 -15 16 35 L -16 35 Q -18 -15 0 -50 Z" fill="#2d2d38"/>
        <!-- Rocket fin left & right -->
        <path d="M-16 20 L -32 42 L -16 35 Z" fill="#e5b869"/>
        <path d="M16 20 L 32 42 L 16 35 Z" fill="#e5b869"/>
        <!-- Window -->
        <circle cx="0" cy="-10" r="7" fill="#15151c" stroke="#e5b869" stroke-width="2"/>
        <!-- Exhaust flame -->
        <path d="M-10 38 Q 0 75 0 85 Q 0 75 10 38 Z" fill="#e5b869" stroke="none"/>
      </g>
      <text x="150" y="325" font-family="sans-serif" font-size="12" font-weight="900" fill="#e5b869" letter-spacing="5" text-anchor="middle">INTO ORBIT</text>
    </svg>`,
  },
  {
    id: "classical-arch",
    name: "Roman Pantheon",
    category: "Architecture",
    suggestedCountry: "ITALIA",
    suggestedDenomination: "L. 200",
    suggestedPaper: "#faf6ed",
    suggestedInk: "#3f362c",
    svg: `<svg viewBox="0 0 300 375" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="300" height="375" fill="#f4ebd9"/>
      <rect x="12" y="12" width="276" height="351" fill="none" stroke="#3f362c" stroke-width="2"/>
      <rect x="16" y="16" width="268" height="343" fill="none" stroke="#3f362c" stroke-width="0.8"/>
      <!-- Classical temple facade -->
      <g fill="none" stroke="#3f362c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <!-- Pediment roof -->
        <polygon points="150,75 50,135 250,135" fill="#ebdcc4"/>
        <circle cx="150" cy="115" r="9" fill="#3f362c"/>
        <rect x="45" y="135" width="210" height="15" fill="#d9c5a7"/>
        <!-- Pillars -->
        <rect x="65" y="150" width="18" height="110" fill="#ebdcc4"/>
        <rect x="105" y="150" width="18" height="110" fill="#ebdcc4"/>
        <rect x="175" y="150" width="18" height="110" fill="#ebdcc4"/>
        <rect x="215" y="150" width="18" height="110" fill="#ebdcc4"/>
        <!-- Central Arch -->
        <path d="M123 260 L 123 190 A 27 27 0 0 1 177 190 L 177 260 Z" fill="#3f362c"/>
        <!-- Base steps -->
        <rect x="40" y="260" width="220" height="10" fill="#d9c5a7"/>
        <rect x="30" y="270" width="240" height="12" fill="#cbaf8c"/>
      </g>
      <text x="150" y="325" font-family="serif" font-size="12" font-weight="bold" fill="#3f362c" letter-spacing="4" text-anchor="middle">MONUMENTA</text>
    </svg>`,
  },
  {
    id: "fuji-wave",
    name: "Pacific Wave & Fuji",
    category: "Landscape",
    suggestedCountry: "NIPPON",
    suggestedDenomination: "¥80",
    suggestedPaper: "#f5f6ee",
    suggestedInk: "#1a4038",
    svg: `<svg viewBox="0 0 300 375" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="300" height="375" fill="#e7eee8"/>
      <rect x="12" y="12" width="276" height="351" fill="none" stroke="#1a4038" stroke-width="2"/>
      <rect x="16" y="16" width="268" height="343" fill="none" stroke="#1a4038" stroke-width="1" stroke-dasharray="4 2"/>
      <!-- Red Sun -->
      <circle cx="150" cy="140" r="48" fill="#bc4749"/>
      <!-- Fuji Cone -->
      <polygon points="150,110 90,240 210,240" fill="#2d5d52" stroke="#1a4038" stroke-width="2"/>
      <!-- Snow cap -->
      <polygon points="150,110 132,150 142,145 150,152 158,145 168,150" fill="#ffffff"/>
      <!-- Cresting Wave -->
      <path d="M20 280 Q 80 230 130 250 Q 180 270 230 240 Q 260 220 280 245 L 280 300 L 20 300 Z" fill="#52796f" stroke="#1a4038" stroke-width="2.5"/>
      <path d="M20 285 Q 90 260 140 270 Q 200 285 280 265 L 280 300 L 20 300 Z" fill="#2f3e46"/>
      <text x="150" y="335" font-family="serif" font-size="13" font-weight="bold" fill="#1a4038" letter-spacing="4" text-anchor="middle">FUJI SAN</text>
    </svg>`,
  },
];
