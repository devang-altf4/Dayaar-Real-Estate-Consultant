// SVG path data for Mumbai's 6 zones (simplified stylized map)
// ViewBox: 0 0 400 800 (vertical orientation, north at top)

export const ZONE_PATHS = {
  'mira-road': {
    path: 'M120,20 C140,15 180,10 220,15 L260,25 C275,30 280,45 275,65 L265,95 C260,110 240,120 220,125 L180,130 C160,128 140,120 130,105 L115,75 C108,55 110,35 120,20 Z',
    labelPos: { x: 190, y: 70 },
    color: '#06b6d4',
  },
  'makabo': {
    path: 'M130,105 C140,120 160,128 180,130 L220,125 C240,120 260,110 265,95 L275,130 C280,155 275,180 265,200 L250,225 C240,240 220,248 200,250 L170,248 C150,245 135,235 125,220 L112,190 C105,170 108,145 115,125 Z',
    labelPos: { x: 190, y: 180 },
    color: '#f59e0b',
  },
  'andheri': {
    path: 'M125,220 C135,235 150,245 170,248 L200,250 C220,248 240,240 250,225 L260,255 C268,280 265,310 255,335 L242,360 C232,375 215,385 195,388 L168,386 C148,382 133,370 125,355 L112,325 C105,300 108,270 115,248 Z',
    labelPos: { x: 185, y: 305 },
    color: '#a855f7',
  },
  'western-suburbs': {
    path: 'M125,355 C133,370 148,382 168,386 L195,388 C215,385 232,375 242,360 L252,390 C258,415 255,440 248,460 L238,480 C230,492 218,500 205,503 L175,502 C160,498 148,490 140,478 L128,452 C120,432 118,408 122,385 Z',
    labelPos: { x: 185, y: 435 },
    color: '#10b981',
  },
  'south-central': {
    path: 'M140,478 C148,490 160,498 175,502 L205,503 C218,500 230,492 238,480 L245,510 C250,535 248,560 242,580 L235,598 C228,610 218,618 205,622 L178,621 C165,618 155,610 148,598 L138,572 C132,550 130,525 134,503 Z',
    labelPos: { x: 188, y: 555 },
    color: '#3b82f6',
  },
  'sobo': {
    path: 'M148,598 C155,610 165,618 178,621 L205,622 C218,618 228,610 235,598 L240,628 C245,655 242,680 235,700 L225,720 C215,738 200,750 185,755 L175,755 C160,750 148,738 140,720 L132,695 C126,672 128,648 135,625 Z',
    labelPos: { x: 185, y: 680 },
    color: '#eab308',
  },
};

// Zone ordering for scroll-based reveal (north to south)
export const ZONE_ORDER = [
  'mira-road',
  'makabo',
  'andheri',
  'western-suburbs',
  'south-central',
  'sobo',
];

// Static fallback data (used if API is unavailable)
export const ZONE_INFO = {
  'mira-road': {
    name: 'Mira Road',
    subtitle: 'Mira Road · Bhayandar · Dahisar',
    description: "Mumbai's fastest-growing northern corridor",
    gradient: 'from-cyan-500 to-teal-600',
  },
  'makabo': {
    name: 'MaKaBo',
    subtitle: 'Malad · Kandivali · Borivali',
    description: 'The established western suburban heartland',
    gradient: 'from-amber-500 to-orange-600',
  },
  'andheri': {
    name: 'Andheri Belt',
    subtitle: 'Goregaon · Andheri · Vile Parle',
    description: "Mumbai's commercial powerhouse",
    gradient: 'from-purple-500 to-fuchsia-600',
  },
  'western-suburbs': {
    name: 'Western Suburbs Core',
    subtitle: 'Santa Cruz · Khar · Bandra',
    description: "Mumbai's most aspirational address",
    gradient: 'from-emerald-500 to-green-600',
  },
  'south-central': {
    name: 'South-Central Mumbai',
    subtitle: 'Dadar · Parel · Mumbai Central',
    description: 'The renaissance corridor',
    gradient: 'from-blue-500 to-indigo-600',
  },
  'sobo': {
    name: 'SoBo',
    subtitle: 'Mumbai Central · Marine Drive · Colaba',
    description: 'The crown jewel of Indian real estate',
    gradient: 'from-yellow-500 to-amber-600',
  },
};
