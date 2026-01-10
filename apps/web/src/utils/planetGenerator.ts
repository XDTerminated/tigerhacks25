import type { Voice } from "../data/voices";

// Planet name components for generation - expanded for more variety
const prefixes = ["Ery", "Vel", "Thry", "Kal", "Zen", "Sol", "Pra", "Isc", "Typh", "Nex", "Vor", "Kry", "Lum", "Ast", "Orb", "Zar", "Dra", "Qua", "Xen", "Pyr", "Neb", "Aur", "Ceph", "Peg", "Lyr"];
const middles = ["thos", "kara", "on", "mora", "thara", "uneth", "vax", "alon", "ara", "ion", "ath", "oss", "ina", "rex", "dus", "nor", "pex", "tis", "gon", "lius", "mar", "tec", "dor", "lux"];
const suffixes = ["Prime", "7", "Delta", "Ridge", "IX", "Station", "Alpha", "Beta", "Minor", "Major", "Gamma", "Sigma", "III", "V", "X", "Outpost", "Nexus", "Haven"];

// Color descriptors - expanded for more variety
const colorDescriptors = ["Deep orange with red streaks", "Bluish green", "Pale icy teal", "Jungle green with gold clouds", "Rust red", "Steel blue with white ridges", "Bright emerald", "Soft lavender", "Indigo with shimmering frost bands", "Crimson with dark patches", "Golden yellow with brown swirls", "Deep purple with silver highlights", "Turquoise with white clouds", "Burnt orange with black streaks", "Mint green with cyan bands", "Rose pink with violet tints", "Charcoal gray with red veins", "Cobalt blue with ice caps", "Amber with bronze clouds", "Seafoam green with blue oceans", "Magenta with purple hazes", "Copper orange with dark swirls", "Sapphire blue with white storms", "Lime green with yellow patches", "Maroon red with black craters", "Aquamarine with silver streaks", "Slate gray with blue tints", "Coral pink with orange bands", "Navy blue with white ice", "Olive green with brown continents"];

// Voice IDs from ElevenLabs
const voiceIds = ["ruirxsoakN0GWmGNIo04", "nzeAacJi50IvxcyDnMXa", "DGzg6RaUqxGRTHSBjfgF", "BZgkqPqms7Kj9ulSkVzn", "NOpBlnGInO9m6vDvFkFC", "exsUS4vynmxd379XN4yO", "NNl6r8mD7vthiJatiJt1", "aMSt68OGf4xUZAnLpTU8", "ys3XeJJA4ArWMhRpcX1D", "oWAxZDx7w5VEj9dCyTzz"];

// Alien name components for researcher
const alienFirstNames = ["Zyx", "Kral", "Vex", "Thar", "Nox", "Qix", "Dro", "Myx", "Plex", "Vorr", "Xan", "Grel", "Zeph", "Kryn", "Thex"];
const alienLastNames = ["Vorthar", "Nexion", "Korath", "Zephros", "Draxon", "Mythros", "Vexar", "Kronix", "Phazon", "Thyros", "Zorax", "Grexis", "Quantum", "Xenith", "Valtor"];

function generateAlienName(): string {
    const firstName = alienFirstNames[Math.floor(Math.random() * alienFirstNames.length)];
    const lastName = alienLastNames[Math.floor(Math.random() * alienLastNames.length)];
    return `${firstName} ${lastName}`;
}

function generatePlanetName(): string {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const middle = middles[Math.floor(Math.random() * middles.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    // Vary the naming pattern for more diversity
    const namePattern = Math.random();

    if (namePattern < 0.4) {
        // Just prefix + middle (40%)
        return `${prefix}${middle}`;
    } else if (namePattern < 0.8) {
        // Prefix + middle + suffix (40%)
        return `${prefix}${middle} ${suffix}`;
    } else {
        // Prefix + suffix (20%)
        return `${prefix} ${suffix}`;
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
    const allFacts = ["temperature", "color", "ocean", "gravity"];
    const shuffled = allFacts.sort(() => Math.random() - 0.5);
    // Each impostor knows 2 facts correctly
    return shuffled.slice(0, 2);
}

export function generateRandomPlanets(count: number = 10): Voice[] {
    const planets: Voice[] = [];
    const usedNames = new Set<string>();
    const usedColors = new Set<string>();
    const shuffledVoiceIds = [...voiceIds].sort(() => Math.random() - 0.5);
    const availableColors = [...colorDescriptors];

    // Pick a random index for the real researcher (Earth-like planet)
    const researcherIndex = Math.floor(Math.random() * count);

    // Generate random stats for the researcher (so they're different each game)
    const researcherTemp = generateTemperature();
    const researcherOcean = generateOceanCoverage();
    const researcherGravity = generateGravity();
    let researcherColor: string;

    // Pick a unique color for researcher
    if (availableColors.length > 0) {
        const colorIndex = Math.floor(Math.random() * availableColors.length);
        researcherColor = availableColors[colorIndex];
        availableColors.splice(colorIndex, 1);
    } else {
        researcherColor = generateColor();
    }

    for (let i = 0; i < count; i++) {
        let planetName = generatePlanetName();

        // Ensure unique names
        while (usedNames.has(planetName)) {
            planetName = generatePlanetName();
        }
        usedNames.add(planetName);

        const isResearcher = i === researcherIndex;

        if (isResearcher) {
            // Real researcher gets random stats and alien name (different each game)
            planets.push({
                id: shuffledVoiceIds[i] || voiceIds[i % voiceIds.length],
                name: generateAlienName(),
                description: "Planetary Researcher",
                planetName: planetName,
                avgTemp: researcherTemp,
                planetColor: researcherColor,
                oceanCoverage: researcherOcean,
                gravity: researcherGravity,
                isResearcher: true,
            });
            usedColors.add(researcherColor);
        } else {
            // Impostors get random stats with unique colors
            let color: string;

            // Pick a unique color
            if (availableColors.length > 0) {
                const colorIndex = Math.floor(Math.random() * availableColors.length);
                color = availableColors[colorIndex];
                availableColors.splice(colorIndex, 1); // Remove to ensure uniqueness
            } else {
                // Fallback if we run out (shouldn't happen with 20 colors for 10 planets)
                color = generateColor();
            }

            planets.push({
                id: shuffledVoiceIds[i] || voiceIds[i % voiceIds.length],
                name: generateAlienName(),
                description: "Planetary Researcher",
                planetName: planetName,
                avgTemp: generateTemperature(),
                planetColor: color,
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
    if (lower.includes("orange") || lower.includes("amber") || lower.includes("burnt") || lower.includes("copper")) {
        return "#FF8C00";
    }
    if (lower.includes("blue") && lower.includes("green")) {
        return "#4169E1"; // Earth-like
    }
    if (lower.includes("teal") || lower.includes("turquoise") || lower.includes("cyan") || lower.includes("aquamarine")) {
        return "#20B2AA";
    }
    if (lower.includes("green") || lower.includes("emerald") || lower.includes("mint") || lower.includes("seafoam") || lower.includes("lime") || lower.includes("olive")) {
        return "#228B22";
    }
    if (lower.includes("red") || lower.includes("crimson") || lower.includes("rust") || lower.includes("maroon")) {
        return "#B7410E";
    }
    if (lower.includes("coral")) {
        return "#FF7F50";
    }
    if (lower.includes("magenta")) {
        return "#FF00FF";
    }
    if (lower.includes("sapphire") || lower.includes("cobalt") || lower.includes("navy")) {
        return "#0047AB";
    }
    if (lower.includes("blue") || lower.includes("steel")) {
        return "#4682B4";
    }
    if (lower.includes("purple") || lower.includes("violet") || lower.includes("indigo")) {
        return "#4B0082";
    }
    if (lower.includes("lavender") || lower.includes("pink")) {
        return "#E6E6FA";
    }
    if (lower.includes("yellow") || lower.includes("gold")) {
        return "#FFD700";
    }
    if (lower.includes("gray") || lower.includes("grey") || lower.includes("charcoal") || lower.includes("slate")) {
        return "#696969";
    }

    return "#888888"; // Default gray
}
