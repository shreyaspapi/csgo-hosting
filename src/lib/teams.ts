import prisma from "@/lib/prisma";

export const TEAM_SIZE = 5;

export async function getCurrentTeam(userId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: { userId },
    include: {
      team: {
        include: {
          captain: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
              steamId: true,
              elo: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatar: true,
                  steamId: true,
                  elo: true,
                },
              },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
          queueEntry: {
            select: {
              id: true,
              status: true,
              region: true,
              joinedAt: true,
              matchId: true,
            },
          },
        },
      },
    },
  });

  return membership?.team ?? null;
}

export async function ensureTeamCaptain(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      captainId: true,
    },
  });

  if (!team || team.captainId !== userId) {
    return null;
  }

  return team;
}
