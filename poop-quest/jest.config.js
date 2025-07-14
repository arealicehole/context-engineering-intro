/**
 * Jest Configuration for Poop Quest
 * ES modules support with Node.js testing
 */

export default {
    // Test environment
    testEnvironment: 'node',
    
    // Enable ES modules
    preset: 'jest-environment-node',
    extensionsToTreatAsEsm: ['.js'],
    
    // Module resolution
    moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    
    // Transform configuration
    transform: {
        '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
    },
    
    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],
    
    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/**/*.spec.js',
        '!src/**/index.js'
    ],
    
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    
    // Coverage reports
    coverageReporters: [
        'text',
        'text-summary',
        'html',
        'lcov'
    ],
    
    // Test setup
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.js'
    ],
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Verbose output
    verbose: true,
    
    // Test timeout
    testTimeout: 10000,
    
    // Globals
    globals: {
        'NODE_ENV': 'test'
    },
    
    // Module directories
    moduleDirectories: [
        'node_modules',
        'src'
    ],
    
    // Test paths to ignore
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/'
    ],
    
    // Coverage paths to ignore
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '/dist/',
        '/build/'
    ]
};