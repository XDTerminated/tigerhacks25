import type { Voice } from '../data/voices';

// Planet name components for generation
const prefixes = ['Ery', 'Vel', 'Thry', 'Kal', 'Zen', 'Sol', 'Pra', 'Isc', 'Typh', 'Nex', 'Vor', 'Kry', 'Lum', 'Ast', 'Orb'];
const middles = ['thos', 'kara', 'on', 'mora', 'thara', 'uneth', 'vax', 'alon', 'ara', 'ion', 'ath', 'oss', 'ina', 'rex'];
const suffixes = ['Prime', '7', 'Delta', 'Ridge', 'IX', 'Station', 'Alpha', 'Beta', 'Minor', 'Major'];

// Color descriptors
const colorDescriptors = [
  'Deep orange with red streaks',
  'Bluish green',
  'Pale icy teal',
  'Jungle green with gold clouds',
  'Rust red',
  'Steel blue with white ridges',
  'Bright emerald',
  'Soft lavender',
  'Indigo with shimmering frost bands',
  'Crimson with dark patches',
  'Golden yellow with brown swirls',
  'Deep purple with silver highlights',
  'Turquoise with white clouds',
  'Burnt orange with black streaks',
  'Mint green with cyan bands',
  'Rose pink with violet tints',
  'Charcoal gray with red veins',
  'Cobalt blue with ice caps',
  'Amber with bronze clouds',
  'Seafoam green with blue oceans'
];

// Voice IDs from ElevenLabs
const voiceIds = [
  'ruirxsoakN0GWmGNIo04',
  'nzeAacJi50IvxcyDnMXa',
  'DGzg6RaUqxGRTHSBjfgF',
  'BZgkqPqms7Kj9ulSkVzn',
  'NOpBlnGInO9m6vDvFkFC',
  'exsUS4vynmxd379XN4yO',
  'NNl6r8mD7vthiJatiJt1',
  'aMSt68OGf4xUZAnLpTU8',
  'ys3XeJJA4ArWMhRpcX1D',
  'oWAxZDx7w5VEj9dCyTzz'
];

function generatePlanetName(): string {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const middle = middles[Math.floor(Math.random() * middles.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  // 50% chance to use suffix
  if (Math.random() > 0.5) {
    return `${prefix}${middle} ${suffix}`;
  } else {
    return `${prefix}${middle}`;
  }
}

function generateTemperature(): string {
  // Range from 0°F to 120°F
  const temp = Math.floor(Math.random() * 121);
  return `${temp}°F`;
}

function generateOceanCoverage(): string {
  // Range from 0% to 95%
  const coverage = Math.floor(Math.random() * 96);
  return `${coverage}%`;
}

function generateGravity(): string {
  // Range from 0.5g to 1.5g
  const gravity = (Math.random() * 1.0 + 0.5).toFixed(2);
  return `${gravity}g`;
}

function generateColor(): string {
  return colorDescriptors[Math.floor(Math.random() * colorDescriptors.length)];
}

function selectRandomFacts(): string[] {
  const allFacts = ['temperature', 'color', 'ocean', 'gravity'];
  const shuffled = allFacts.sort(() => Math.random() - 0.5);
  // Each impostor knows 2 facts correctly
  return shuffled.slice(0, 2);
}

export function generateRandomPlanets(count: number = 10): Voice[] {
  const planets: Voice[] = [];
  const usedNames = new Set<string>();
  const shuffledVoiceIds = [...voiceIds].sort(() => Math.random() - 0.5);
  
  // Pick a random index for the real researcher (Earth-like planet)
  const researcherIndex = Math.floor(Math.random() * count);
  
  for (let i = 0; i < count; i++) {
    let planetName = generatePlanetName();
    
    // Ensure unique names
    while (usedNames.has(planetName)) {
      planetName = generatePlanetName();
    }
    usedNames.add(planetName);
    
    const isResearcher = i === researcherIndex;
    
    if (isResearcher) {
      // Real researcher gets Earth-like stats
      planets.push({
        id: shuffledVoiceIds[i] || voiceIds[i % voiceIds.length],
        name: `Voice ${i + 1}`,
        description: 'Planetary Researcher',
        planetName: planetName + ' Research Station',
        avgTemp: '59°F', // Earth-like
        planetColor: 'Blue and green with white clouds',
        oceanCoverage: '71%',
        gravity: '1.00g',
        isResearcher: true,
      });
    } else {
      // Impostors get random stats
      planets.push({
        id: shuffledVoiceIds[i] || voiceIds[i % voiceIds.length],
        name: `Voice ${i + 1}`,
        description: 'Planetary Researcher',
        planetName: planetName,
        avgTemp: generateTemperature(),
        planetColor: generateColor(),
        oceanCoverage: generateOceanCoverage(),
        gravity: generateGravity(),
        correctFacts: selectRandomFacts(),
      });
    }
  }
  
  return planets;
}

// Helper to extract base color from description for planet rendering
export function getBaseColorFromDescription(colorDescription: string): string {
  const lower = colorDescription.toLowerCase();
  
  // Map color descriptions to hex values for planet rendering
  if (lower.includes('orange') || lower.includes('amber') || lower.includes('burnt')) {
    return '#FF8C00';
  }
  if (lower.includes('blue') && lower.includes('green')) {
    return '#4169E1'; // Earth-like
  }
  if (lower.includes('teal') || lower.includes('turquoise') || lower.includes('cyan')) {
    return '#20B2AA';
  }
  if (lower.includes('green') || lower.includes('emerald') || lower.includes('mint') || lower.includes('seafoam')) {
    return '#228B22';
  }
  if (lower.includes('red') || lower.includes('crimson') || lower.includes('rust')) {
    return '#B7410E';
  }
  if (lower.includes('blue') || lower.includes('cobalt') || lower.includes('steel')) {
    return '#4682B4';
  }
  if (lower.includes('purple') || lower.includes('violet') || lower.includes('indigo')) {
    return '#4B0082';
  }
  if (lower.includes('lavender') || lower.includes('pink')) {
    return '#E6E6FA';
  }
  if (lower.includes('yellow') || lower.includes('gold')) {
    return '#FFD700';
  }
  if (lower.includes('gray') || lower.includes('grey') || lower.includes('charcoal')) {
    return '#696969';
  }
  
  return '#888888'; // Default gray
}
