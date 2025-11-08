export interface Voice {
  id: string;
  name: string;
  description: string;
  planetName: string;
  avgTemp: string;
  planetColor: string;
  oceanCoverage: string;
  gravity: string;
  isResearcher?: boolean;
  correctFacts?: string[]; // Which facts this fake researcher knows correctly
}

export const VOICES: Voice[] = [
  {
    id: 'ruirxsoakN0GWmGNIo04',
    name: 'Voice 1',
    description: 'Planetary Researcher',
    planetName: 'Erythos Prime',
    avgTemp: '26°C',
    planetColor: 'Deep orange with red streaks',
    oceanCoverage: '41%',
    gravity: '0.92g',
    correctFacts: ['temperature', 'color'], // Knows temp and color, lies about ocean and gravity
  },
  {
    id: 'nzeAacJi50IvxcyDnMXa',
    name: 'Voice 2',
    description: 'Planetary Researcher',
    planetName: 'Velkara',
    avgTemp: '14°C',
    planetColor: 'Bluish green',
    oceanCoverage: '78%',
    gravity: '1.08g',
    correctFacts: ['ocean', 'gravity'], // Knows ocean and gravity, lies about temp and color
  },
  {
    id: 'DGzg6RaUqxGRTHSBjfgF',
    name: 'Voice 3',
    description: 'Planetary Researcher',
    planetName: 'Thryon-7',
    avgTemp: '–3°C',
    planetColor: 'Pale icy teal',
    oceanCoverage: '22%',
    gravity: '0.74g',
    correctFacts: ['temperature', 'gravity'], // Knows temp and gravity, lies about color and ocean
  },
  {
    id: 'BZgkqPqms7Kj9ulSkVzn',
    name: 'Voice 4',
    description: 'Planetary Researcher',
    planetName: 'Kalmora',
    avgTemp: '33°C',
    planetColor: 'Jungle green with gold clouds',
    oceanCoverage: '42%',
    gravity: '1.03g',
    correctFacts: ['color', 'ocean'], // Knows color and ocean, lies about temp and gravity
  },
  {
    id: 'NOpBlnGInO9m6vDvFkFC',
    name: 'Voice 5',
    description: 'Planetary Researcher',
    planetName: 'Zenthara',
    avgTemp: '47°C',
    planetColor: 'Rust red',
    oceanCoverage: '8%',
    gravity: '0.88g',
    correctFacts: ['temperature', 'ocean'], // Knows temp and ocean, lies about color and gravity
  },
  {
    id: 'exsUS4vynmxd379XN4yO',
    name: 'Voice 6',
    description: 'Planetary Researcher',
    planetName: 'Earth Research Station',
    avgTemp: '15°C',
    planetColor: 'Blue and green with white clouds',
    oceanCoverage: '71%',
    gravity: '1.00g',
    isResearcher: true, // Real researcher - knows everything correctly
  },
  {
    id: 'NNl6r8mD7vthiJatiJt1',
    name: 'Voice 7',
    description: 'Planetary Researcher',
    planetName: 'Soluneth',
    avgTemp: '–18°C',
    planetColor: 'Indigo with shimmering frost bands',
    oceanCoverage: '29%',
    gravity: '0.61g',
    correctFacts: ['color', 'gravity'], // Knows color and gravity, lies about temp and ocean
  },
  {
    id: 'aMSt68OGf4xUZAnLpTU8',
    name: 'Voice 8',
    description: 'Planetary Researcher',
    planetName: 'Pravax Delta',
    avgTemp: '29°C',
    planetColor: 'Bright emerald',
    oceanCoverage: '61%',
    gravity: '1.11g',
    correctFacts: ['temperature', 'color'], // Knows temp and color, lies about ocean and gravity
  },
  {
    id: 'ys3XeJJA4ArWMhRpcX1D',
    name: 'Voice 9',
    description: 'Planetary Researcher',
    planetName: 'Iscalon Ridge',
    avgTemp: '22°C',
    planetColor: 'Steel blue with white ridges',
    oceanCoverage: '51%',
    gravity: '0.97g',
    correctFacts: ['ocean', 'gravity'], // Knows ocean and gravity, lies about temp and color
  },
  {
    id: 'ys3XeJJA4ArWMhRpcX1D',
    name: 'Voice 10',
    description: 'Planetary Researcher',
    planetName: 'Typhara IX',
    avgTemp: '9°C',
    planetColor: 'Soft lavender',
    oceanCoverage: '84%',
    gravity: '0.79g',
    correctFacts: ['temperature', 'gravity'], // Knows temp and gravity, lies about color and ocean
  },
];
