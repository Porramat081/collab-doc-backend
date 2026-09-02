/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  // Source uses NodeNext-style ".js" specifiers; strip them for the CJS resolver.
  // The dots must stay escaped, otherwise this also swallows node_modules' ".cjs" files.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
  },
  testMatch: ["**/*.test.ts"],
  setupFiles: ["<rootDir>/src/tests/env.setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  forceExit: true,
};
