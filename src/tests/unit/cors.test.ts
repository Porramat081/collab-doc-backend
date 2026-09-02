import { isOriginAllowed } from "../../config/env.js";

const APP = "https://collab-doc-frontend-indol.vercel.app";

describe("isOriginAllowed", () => {
  test("matches the deployed frontend exactly", () => {
    expect(isOriginAllowed(APP, [APP])).toBe(true);
  });

  test("tolerates a trailing slash in the configured value", () => {
    // What you get from copying the URL out of the browser address bar.
    expect(isOriginAllowed(APP, ["https://collab-doc-frontend-indol.vercel.app/"])).toBe(
      true,
    );
  });

  test("tolerates surrounding whitespace and casing", () => {
    expect(isOriginAllowed(APP, ["  HTTPS://Collab-Doc-Frontend-Indol.Vercel.App/  "])).toBe(
      true,
    );
  });

  test("rejects a different origin", () => {
    expect(isOriginAllowed("https://evil.example.com", [APP])).toBe(false);
  });

  test("rejects a scheme mismatch", () => {
    expect(isOriginAllowed("http://collab-doc-frontend-indol.vercel.app", [APP])).toBe(
      false,
    );
  });

  test('"*" allows anything', () => {
    expect(isOriginAllowed("https://anything.example.com", ["*"])).toBe(true);
  });

  test("allows requests with no Origin header (curl, health checks)", () => {
    expect(isOriginAllowed(undefined, [APP])).toBe(true);
  });

  test("supports several origins", () => {
    const allowed = [APP, "http://localhost:3000"];
    expect(isOriginAllowed("http://localhost:3000", allowed)).toBe(true);
    expect(isOriginAllowed(APP, allowed)).toBe(true);
    expect(isOriginAllowed("https://other.vercel.app", allowed)).toBe(false);
  });

  describe("wildcard subdomains (Vercel previews)", () => {
    const allowed = ["https://*.vercel.app"];

    test("matches a preview deployment", () => {
      expect(
        isOriginAllowed("https://collab-doc-frontend-git-dev-porramat.vercel.app", allowed),
      ).toBe(true);
    });

    test("matches the production alias", () => {
      expect(isOriginAllowed(APP, allowed)).toBe(true);
    });

    test("does not match the bare apex domain", () => {
      expect(isOriginAllowed("https://vercel.app", allowed)).toBe(false);
    });

    test("does not match a lookalike suffix", () => {
      expect(isOriginAllowed("https://notvercel.app", allowed)).toBe(false);
      expect(isOriginAllowed("https://evil-vercel.app", allowed)).toBe(false);
    });

    test("does not match over plain http", () => {
      expect(isOriginAllowed("http://preview.vercel.app", allowed)).toBe(false);
    });
  });
});
