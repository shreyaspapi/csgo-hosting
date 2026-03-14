export const COMPETITIVE_MAPS = [
  "de_dust2",
  "de_mirage",
  "de_inferno",
  "de_nuke",
  "de_ancient",
  "de_anubis",
  "de_overpass",
] as const;

export type CompetitiveMap = (typeof COMPETITIVE_MAPS)[number];

export const DEFAULT_MATCH_MAP: CompetitiveMap = "de_dust2";

export function isCompetitiveMap(value: string): value is CompetitiveMap {
  return COMPETITIVE_MAPS.includes(value as CompetitiveMap);
}

export function formatMapName(map: string): string {
  return map
    .replace(/^de_/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
