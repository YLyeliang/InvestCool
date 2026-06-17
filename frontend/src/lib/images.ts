const fallbackCover = "/nasdaq_war_impact.png";

export const getReliableCover = (cover?: string | null) => {
  if (!cover) return fallbackCover;
  if (cover.startsWith("http://") || cover.startsWith("https://")) return fallbackCover;
  return cover;
};
