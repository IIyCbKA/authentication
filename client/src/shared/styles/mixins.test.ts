import { fileURLToPath } from "node:url";
import { compile, compileString } from "sass";
import { describe, expect, it } from "vitest";

const stylesPath = fileURLToPath(new URL("./", import.meta.url));

describe("shared Sass mixins", () => {
  it("does not emit classes until a consumer includes the mixin", () => {
    expect(compile(`${stylesPath}/_mixins.scss`).css).toBe("");
  });

  it("adds truncation to the consumer's own selector", () => {
    const css = compileString(
      '@use "mixins"; .username { @include mixins.truncateText; color: red; }',
      { loadPaths: [stylesPath] },
    ).css;

    expect(css).toContain(".username {");
    expect(css).toContain("white-space: nowrap;");
    expect(css).toContain("text-overflow: ellipsis;");
    expect(css).toContain("overflow: hidden;");
    expect(css).not.toContain(".truncateText");
  });

  it("allows a consumer to override a wrapping mixin after including it", () => {
    const css = compileString(
      '@use "mixins"; .message { @include mixins.breakText; hyphens: manual; }',
      { loadPaths: [stylesPath] },
    ).css;

    expect(css).toContain("white-space: normal;");
    expect(css).toContain("overflow-wrap: break-word;");
    expect(css.indexOf("hyphens: auto;")).toBeLessThan(
      css.indexOf("hyphens: manual;"),
    );
  });

  it("does not expose Auth-only logo dimensions on the document root", () => {
    const css = compile(`${stylesPath}/index.scss`).css;

    expect(css).not.toContain("--auth-logo-indent:");
    expect(css).not.toContain("--auth-logo-size:");
  });
});
