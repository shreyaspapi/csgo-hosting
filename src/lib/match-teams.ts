export function getMatchTeamNames(
  queueEntries: Array<{ team: { name: string } | null }>
) {
  const namedTeams = queueEntries
    .map((entry) => entry.team?.name ?? null)
    .filter((name): name is string => Boolean(name));

  return {
    teamAName: namedTeams[0] ?? "Team A",
    teamBName: namedTeams[1] ?? "Team B",
  };
}
