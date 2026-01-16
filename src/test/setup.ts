import { vi, beforeEach, afterEach } from 'vitest';

// Set environment variables for tests
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.JWT_EXPIRES_IN = '3600';

// Mock Prisma
vi.mock('@/libs/prisma', () => ({
  default: {
    users: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tournaments: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    tournament_registrations: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    matches: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user_blocks: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    categories: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    competitors: {
      findUnique: vi.fn(),
    },
    judges: {
      findUnique: vi.fn(),
    },
    clubs: {
      findUnique: vi.fn(),
    },
    robots: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      users: {
        create: vi.fn(),
        update: vi.fn(),
      },
      competitors: {
        create: vi.fn(),
      },
      club_owner: {
        create: vi.fn(),
      },
      judges: {
        create: vi.fn(),
      },
    })),
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
}));

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
