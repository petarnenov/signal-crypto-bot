# Test Documentation

This directory contains comprehensive tests for the Signal Crypto Bot
application, organized by type and functionality.

## Test Structure

```bash
test/
├── backend/                 # Backend service tests
│   ├── database.test.js     # Database operations
│   ├── signal-generator.test.js  # Signal generation logic
│   └── paper-trading.test.js     # Paper trading functionality
├── frontend/                # Frontend component tests
│   ├── components/          # React component tests
│   ├── pages/              # Page component tests
│   ├── hooks/              # Custom hook tests
│   ├── context/            # Context provider tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
│   └── websocket-integration.test.js  # WebSocket communication
├── utils/                  # Test utilities and helpers
│   └── test-helpers.js     # Common test functions
└── setup.js               # Global test setup
```

## Running Tests

### Backend Tests

```bash
# Run all backend tests
npm run test:backend

# Run specific backend test
npm run test test/backend/database.test.js
```

### Frontend Tests

```bash
# Run all frontend tests
npm run test:frontend

# Run specific frontend test
npm run test frontend/test/components/ErrorBoundary.test.jsx
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### All Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Categories

### Backend Test Categories

- **Database Tests**: Test database operations, CRUD operations, and data
  integrity
- **Signal Generator Tests**: Test signal generation logic, AI integration,
  and market analysis
- **Paper Trading Tests**: Test paper trading account management, position
  tracking, and order execution

### Frontend Test Categories

- **Component Tests**: Test React components in isolation
- **Hook Tests**: Test custom React hooks
- **Context Tests**: Test context providers and state management
- **Page Tests**: Test complete page components

### Integration Test Categories

- **WebSocket Tests**: Test real-time communication between frontend and
  backend
- **API Tests**: Test complete API workflows
- **End-to-End Tests**: Test complete user workflows

## Test Utilities

### Mock Data

The `test/utils/test-helpers.js` file provides utility functions for
creating mock data:

```javascript
import { createMockSignal, createMockAccount, createMockPosition } 
  from '../utils/test-helpers.js';

const mockSignal = createMockSignal({ signalType: 'buy' });
const mockAccount = createMockAccount({ balance: 10000 });
const mockPosition = createMockPosition({ symbol: 'BTCUSDT' });
```

### Database Helpers

```javascript
import { createTestDatabase, seedTestDatabase } from '../utils/test-helpers.js';

const db = await createTestDatabase();
await seedTestDatabase(db);
```

### Validation Helpers

```javascript
import { validateSignal, validateAccount, validatePosition } from '../utils/test-helpers.js';

validateSignal(signal); // Validates signal data structure
validateAccount(account); // Validates account data structure
validatePosition(position); // Validates position data structure
```

## Test Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the AAA pattern: Arrange, Act, Assert

### 2. Mocking

- Mock external dependencies (APIs, databases, WebSocket)
- Use `vi.fn()` for function mocks
- Mock console methods to avoid noise in test output

### 3. Database Testing

- Use in-memory SQLite databases for tests
- Clean up data after each test
- Seed test data for consistent test scenarios

### 4. Component Testing

- Test component rendering and user interactions
- Test error states and loading states
- Test component integration with context providers

### 5. Integration Testing

- Test complete workflows from frontend to backend
- Test WebSocket communication and real-time updates
- Test error handling and edge cases

## Test Coverage

The test suite aims to achieve:

- **Unit Tests**: 90%+ coverage for individual functions and components
- **Integration Tests**: Complete workflow coverage
- **Error Handling**: All error scenarios and edge cases
- **Performance**: Critical path performance testing

## Continuous Integration

Tests are automatically run:

- On every pull request
- Before deployment
- During development with watch mode

## Debugging Tests

### Running Tests in Debug Mode

```bash
# Run tests with debug output
npm run test -- --reporter=verbose

# Run specific test with debug
npm run test -- --reporter=verbose test/backend/database.test.js
```

### Using Test UI

```bash
# Open test UI for interactive debugging
npm run test:ui
```

### Database Inspection

```bash
# Inspect test database
sqlite3 test.db ".tables"
sqlite3 test.db "SELECT * FROM signals;"
```

## Common Test Patterns

### Async Testing

```javascript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Error Testing

```javascript
it('should handle errors gracefully', async () => {
  await expect(asyncFunction()).rejects.toThrow('Expected error');
});
```

### Component Testing

```javascript
it('should render component correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

### WebSocket Testing

```javascript
it('should handle WebSocket messages', (done) => {
  ws.on('message', (data) => {
    const response = JSON.parse(data);
    expect(response.type).toBe('expected_type');
    done();
  });
  
  ws.send(JSON.stringify(message));
});
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate mock data and utilities
3. Ensure tests are isolated and don't depend on external state
4. Add integration tests for new features
5. Update this documentation if needed
