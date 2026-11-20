import type {
  Category,
  SimilarReportCandidate,
  SimilarReportMatch,
} from "./types";

const FRENCH_STOP_WORDS = new Set([
  "avec",
  "dans",
  "pour",
  "sans",
  "sous",
  "vers",
  "chez",
  "entre",
  "plus",
  "tres",
  "tout",
  "tous",
  "toute",
  "cette",
  "celui",
  "celle",
  "sont",
  "etre",
  "avoir",
  "fait",
  "faire",
  "depuis",
  "hors",
  "pres",
  "presque",
  "aussi",
  "alors",
  "mais",
  "donc",
  "elle",
  "elles",
  "nous",
  "vous",
  "leurs",
  "notre",
  "votre",
  "probleme",
  "souci",
  "panne",
]);

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSignificantTokens(title: string): string[] {
  const normalized = normalizeText(title);
  if (!normalized) return [];
  const tokens = normalized
    .split(" ")
    .filter((token) => token.length >= 3 && !FRENCH_STOP_WORDS.has(token));
  return Array.from(new Set(tokens));
}

export interface SimilarityQuery {
  title: string;
  category?: Category;
  location?: string;
}

export function findSimilarActiveReports(
  query: SimilarityQuery,
  candidates: SimilarReportCandidate[],
  limit = 5
): SimilarReportMatch[] {
  const queryTokens = extractSignificantTokens(query.title);
  const queryLocation = normalizeText(query.location ?? "");

  if (queryTokens.length === 0 && !query.category && !queryLocation) {
    return [];
  }

  const matches: SimilarReportMatch[] = [];

  for (const candidate of candidates) {
    if (candidate.status === "RESOLU") {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    if (query.category && candidate.category === query.category) {
      score += 3;
      reasons.push("Même catégorie");
    }

    const candidateLocation = normalizeText(candidate.location);
    if (queryLocation.length >= 2 && candidateLocation.length >= 2) {
      if (candidateLocation === queryLocation) {
        score += 3;
        reasons.push("Même lieu");
      } else if (
        candidateLocation.includes(queryLocation) ||
        queryLocation.includes(candidateLocation)
      ) {
        score += 2;
        reasons.push("Lieu proche");
      }
    }

    const candidateTokens = new Set(extractSignificantTokens(candidate.title));
    const sharedTokens = queryTokens.filter((token) => {
      if (candidateTokens.has(token)) return true;
      for (const candidateToken of candidateTokens) {
        if (
          candidateToken.length >= 4 &&
          token.length >= 4 &&
          (candidateToken.startsWith(token) || token.startsWith(candidateToken))
        ) {
          return true;
        }
      }
      return false;
    });

    if (sharedTokens.length > 0) {
      score += sharedTokens.length * 2;
      reasons.push(
        sharedTokens.length === 1
          ? `Mot commun (« ${sharedTokens[0]} »)`
          : `${sharedTokens.length} mots communs`
      );
    }

    // Exiger au moins un signal fort (mots communs, ou catégorie + lieu)
    const hasMeaningfulSignal =
      sharedTokens.length > 0 ||
      (query.category &&
        candidate.category === query.category &&
        queryLocation.length >= 2 &&
        (candidateLocation === queryLocation ||
          candidateLocation.includes(queryLocation) ||
          queryLocation.includes(candidateLocation)));

    if (hasMeaningfulSignal && score >= 3) {
      matches.push({
        ...candidate,
        score,
        reasons,
      });
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.supportCount !== a.supportCount) return b.supportCount - a.supportCount;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return matches.slice(0, limit);
}
