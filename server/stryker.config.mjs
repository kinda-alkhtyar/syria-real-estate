// Mutation testing is deliberately scoped, not repo-wide. These are the files
// where a silently weak test is most expensive: session issuing and validation,
// the cookie that carries the session, the role guard, and the ownership and
// moderation rules that decide who may change a listing. Everything else is
// covered by the ordinary suite.
//
// Runner note: both workspaces use the Node built-in test runner (`node --test`),
// not Vitest, so the TAP runner is the matching plugin — `--test-reporter=tap`
// turns each test file into the TAP stream it consumes.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  testRunner: 'tap',
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',

  mutate: [
    'src/services/authentication.service.js',
    'src/services/property.service.js',
    'src/middleware/authentication.middleware.js',
    'src/utils/auth-cookie.js',
    'src/utils/session-token.js',
  ],

  tap: {
    testFiles: ['test/**/*.test.js'],
    nodeArgs: ['--test-reporter=tap'],
  },

  // A surviving mutant on these files is a real gap, so the run fails the
  // build below 80 rather than reporting a number nobody acts on.
  thresholds: { high: 90, low: 80, break: 80 },
  timeoutMS: 20000,
  tempDirName: '.stryker-tmp',
  htmlReporter: { fileName: 'reports/mutation/index.html' },
}
