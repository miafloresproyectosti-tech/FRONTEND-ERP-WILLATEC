const ALLOWED_TAGS = new Set(["strong", "b", "em", "i", "u", "br"]);

export function sanitizeLimitedRichText(value?: string | null): string {
  if (!value) return "";

  const container = document.createElement("div");
  container.innerHTML = value;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map(walk).join("");

    if (tag === "br") return "<br>";
    if (!ALLOWED_TAGS.has(tag)) return children;

    const normalizedTag =
      tag === "b" ? "strong" : tag === "i" ? "em" : tag;

    return `<${normalizedTag}>${children}</${normalizedTag}>`;
  };

  return Array.from(container.childNodes).map(walk).join("");
}
