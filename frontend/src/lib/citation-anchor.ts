// Stable DOM ids shared by citation pills and the expandable Sources list.
export function citationAnchorId(controlId: string): string {
  const slug = controlId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `citation-${slug}`;
}
