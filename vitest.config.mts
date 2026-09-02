import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest was installed in Phase 0 and `npm test` has always been `vitest run`,
// but until Phase 7 there was nothing to run and so no config.
//
// `.mts`, not `.ts`: `package.json` has no `"type": "module"` (CLAUDE.md
// pitfall 15), so a `.ts` config is loaded as CommonJS and Vite warns that its
// `import`/`import.meta` are unsupported. The extension is already in
// `tsconfig.json`'s `include`.
//
// The alias is the only real content here. Vitest does not read `paths` out of
// `tsconfig.json`, so without it every `@/…` import resolves to nothing — done
// by hand rather than through `vite-tsconfig-paths` to avoid a dependency for
// four lines. `matching.ts` itself imports nothing, but the tests still address
// it the way the rest of the codebase does, and the tests `plan.md` lists as a
// stretch (the Zod branches, `sanitizeByCategory`) cannot avoid the alias.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Pure logic in `src/lib`; nothing here renders a component, so jsdom would
    // only be a slower start-up.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
