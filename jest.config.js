module.exports = {
  testEnvironment: 'node',
  testTimeout: 300000, // 5 minutes for long-running load tests
  verbose: true,
  collectCoverageFrom: [
    'app.js',
    'routes/**/*.js',
    'services/**/*.js',
    'workers/**/*.js',
    'middleware/**/*.js'
  ],
  testMatch: ['**/test/**/*.test.js']
};

