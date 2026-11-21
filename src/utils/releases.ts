export const CRAZYJAM_RECORDS_TAG = "This Jam is Crazy";
export const CRAZYJAM_RECORDS_NAME = "CrazyJam Records";
export const CRAZYJAM_RECORDS_OWNERSHIP = `${CRAZYJAM_RECORDS_TAG} — owned by ${CRAZYJAM_RECORDS_NAME}`;

export function isCrazyJamRelease(release: any): boolean {
  const tags = Array.isArray(release?.tags)
    ? release.tags
    : typeof release?.tags === "string"
      ? release.tags.split(/[,;]/)
      : [];
  const legacyText = [release?.title, release?.description, release?.marketingBlurb]
    .filter(Boolean)
    .join(" ");
  return [...tags, legacyText].some((value) => /this\s+(?:jam|song)\s+is\s+crazy/i.test(String(value)));
}

export function releaseArtistName(release: any): string {
  return isCrazyJamRelease(release)
    ? CRAZYJAM_RECORDS_NAME
    : release?.artistName || "Independent Producer";
}
