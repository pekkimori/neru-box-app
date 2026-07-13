import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const TOTAL_SPECIES = 649;
const CONCURRENCY = 16;
const MAX_RETRIES = 3;
const OUTPUT_URL = new URL('../constants/pokemon-species-rarity.json', import.meta.url);

async function fetchSpecies(id, attempt = 0) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!response.ok) throw new Error(`PokéAPI returned ${response.status}`);
    const species = await response.json();
    if (
      typeof species.capture_rate !== 'number'
      || typeof species.is_legendary !== 'boolean'
      || typeof species.is_mythical !== 'boolean'
      || !Array.isArray(species.flavor_text_entries)
    ) {
      throw new Error('PokéAPI response is missing Species fields');
    }

    const englishFlavorEntries = species.flavor_text_entries.filter(
      (entry) => entry.language?.name === 'en' && typeof entry.flavor_text === 'string',
    );
    const latestFlavorEntry = englishFlavorEntries.at(-1);
    const flavorText = latestFlavorEntry?.flavor_text
      .replace(/[\n\f\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!flavorText) throw new Error('PokéAPI response has no English flavor text');

    return {
      id,
      captureRate: species.capture_rate,
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      flavorText,
    };
  } catch (error) {
    if (attempt >= MAX_RETRIES - 1) throw new Error(`Species ${id}: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    return fetchSpecies(id, attempt + 1);
  }
}

async function main() {
  const records = new Array(TOTAL_SPECIES);
  let nextId = 1;

  async function worker() {
    while (nextId <= TOTAL_SPECIES) {
      const id = nextId;
      nextId += 1;
      records[id - 1] = await fetchSpecies(id);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await writeFile(OUTPUT_URL, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

  const legendary = records.filter((record) => record.isLegendary).length;
  const mythical = records.filter((record) => record.isMythical).length;
  console.log(`Synced ${records.length} species to ${fileURLToPath(OUTPUT_URL)} (${legendary} legendary, ${mythical} mythical).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
