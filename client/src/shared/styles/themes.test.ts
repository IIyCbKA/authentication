import { fileURLToPath } from "node:url";
import { compile, compileString } from "sass";
import { describe, expect, it } from "vitest";

const stylesPath = fileURLToPath(new URL("./", import.meta.url));
const css = compile(`${stylesPath}/index.scss`).css;

function declarations(selector: string): Map<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rules = css.matchAll(
    new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^{}]*)\\}`, "g"),
  );
  return new Map(
    [...rules].flatMap(([, body]) =>
      [...body.matchAll(/([\w-]+):\s*([^;]+);/g)].map(
        ([, name, value]) => [name, value.replace(/\s+/g, " ").trim()] as const,
      ),
    ),
  );
}

const registered = new Map(
  [...css.matchAll(/@property\s+(--[\w-]+)\s*\{([^{}]*)\}/g)].map(
    ([, name, body]) => [name, body],
  ),
);

describe("compiled theme styles", () => {
  it("registers every animated theme color with an inheritable color type", () => {
    const dark = declarations(":root[data-theme=dark]");
    const light = declarations(":root[data-theme=light]");
    const colors = [...dark.keys()].filter((name) => name.startsWith("--"));

    expect(colors.length).toBeGreaterThan(0);
    expect([...registered.keys()].sort()).toEqual(colors.sort());
    expect([...light.keys()].sort()).toEqual([...dark.keys()].sort());

    for (const [name, body] of registered) {
      expect(body).toContain('syntax: "<color>"');
      expect(body).toContain("inherits: true");
      expect(body).toContain(`initial-value: ${dark.get(name)};`);
    }
  });

  it("keeps the existing palettes and defaults to dark", () => {
    const root = declarations(":root");
    const light = declarations(":root[data-theme=light]");

    expect(root.get("color-scheme")).toBe("dark");
    expect(root.get("--background-color")).toBe("rgb(23, 33, 43)");
    expect(root.get("--text-color")).toBe("rgb(255, 255, 255)");
    expect(light.get("color-scheme")).toBe("light");
    expect(light.get("--background-color")).toBe("rgb(245, 247, 250)");
    expect(light.get("--text-color")).toBe("rgb(31, 41, 55)");
  });

  it("transitions the registered colors and derives shadows from them", () => {
    const root = declarations(":root");
    const transitions = root.get("transition-property")!.split(/,\s*/);

    expect(transitions.sort()).toEqual([...registered.keys()].sort());
    expect(root.get("transition-duration")).toBe("var(--duration-theme)");
    expect(root.get("--duration-theme")).toBe("600ms");
    expect(root.get("--common-bs")).toContain("var(--shadow-soft-color)");
    expect(root.get("--common-bs")).toContain("var(--shadow-strong-color)");
  });

  it("limits OS theme detection to the explicit system mode", () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: light\)\s*\{\s*:root\[data-theme=system\]/,
    );
    expect(declarations(":root[data-theme=system]")).toEqual(
      declarations(":root[data-theme=light]"),
    );
  });

  it("disables theme transitions when reduced motion is requested", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{\s*transition: none;/,
    );
    expect(css).toMatch(
      /:root \*,\s*:root \*::before,\s*:root \*::after\s*\{\s*transition-duration: 0s !important;\s*transition-delay: 0s !important;/,
    );
  });

  it("keeps the shared mobile boundary at 600px", () => {
    const probe = compileString(
      '@use "breakpoints"; .probe { @media (max-width: breakpoints.$mobile) { display: none; } }',
      { loadPaths: [stylesPath] },
    ).css;

    expect(probe).toContain("@media (max-width: 600px)");
    expect(probe).toContain(".probe");
  });
});
