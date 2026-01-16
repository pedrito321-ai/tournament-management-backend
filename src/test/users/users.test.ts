import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/route';
import { createMockRequest, createAuthenticatedRequest } from '@/test/helpers/request';
import prisma from '@/libs/prisma';
import {
  adminToken,
  competitorToken,
} from '@/test/helpers/fixtures';

// Mock user service
vi.mock('@/service/users', () => ({
  getUsers: vi.fn().mockResolvedValue({
    total: 2,
    users: [
      { id: 1, name: 'Admin', role: 'admin' },
      { id: 2, name: 'Competitor', role: 'competitor' },
    ],
  }),
  createUser: vi.fn().mockResolvedValue({
    id: 100,
    name: 'New',
    lastName: 'User',
    nickname: 'new_user',
    email: 'new@test.com',
    role: 'competitor',
  }),
  validateNicknameExists: vi.fn().mockResolvedValue({ error: null }),
  validateEmailExists: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/libs/user/validateRol', () => ({
  validateRol: vi.fn().mockResolvedValue(null),
}));

import { getUsers, validateNicknameExists, validateEmailExists } from '@/service/users';
import { validateRol } from '@/libs/user/validateRol';

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('List Users - Authenticated', () => {
    it('should return list of users when authenticated', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users?skip=0&take=10',
      });

      const response = await GET(request);
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toBe('Acceso concedido');
      expect(json.total).toBeDefined();
      expect(json.data).toBeDefined();
    });

    it('should accept skip and take parameters', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users?skip=5&take=20',
      });

      await GET(request);

      expect(getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 20,
        })
      );
    });

    it('should return 400 for invalid skip parameter', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users?skip=-1&take=10',
      });

      const response = await GET(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('skip');
    });

    it('should return 400 for invalid take parameter', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users?skip=0&take=0',
      });

      const response = await GET(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('take');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/users?skip=0&take=10',
      });

      const response = await GET(request);
      const json = await response?.json();

      expect(response?.status).toBe(401);
      expect(json.message).toContain('token');
    });
  });
});

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateNicknameExists).mockResolvedValue({});
    vi.mocked(validateEmailExists).mockResolvedValue({});
    vi.mocked(validateRol).mockResolvedValue(null);
    vi.mocked(prisma.categories.findUnique).mockResolvedValue({ id: 1, name: 'Category' } as never);
  });

  const validUserData = {
    name: 'New',
    lastName: 'User',
    age: 25,
    nickname: 'new_user',
    email: 'new@test.com',
    user_password: 'Password123!',
    role: 'competitor',
    club_id: 1,
    dni: '12345678',
  };

  describe('Successful Creation - Admin Only', () => {
    it('should return 201 when admin creates user', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        body: validUserData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(201);
      expect(json.message).toContain('Usuario creado exitosamente');
      expect(json.user).toBeDefined();
    });

    it('should not return password in response', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        body: validUserData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(json.user.user_password).toBeUndefined();
      expect(json.user.password).toBeUndefined();
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        body: validUserData,
      });

      const response = await POST(request);

      expect(response?.status).toBe(401);
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when competitor tries to create user', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        body: validUserData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('Validation Errors', () => {
    it('should return 409 when nickname already exists', async () => {
      vi.mocked(validateNicknameExists).mockResolvedValue({
        error: 'El nickname ya está en uso',
        status: 409,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        body: validUserData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(409);
      expect(json.error).toContain('nickname');
    });

    it('should return 409 when email already exists', async () => {
      vi.mocked(validateEmailExists).mockResolvedValue({
        error: 'El email ya está en uso',
        status: 409,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        body: validUserData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(409);
      expect(json.error).toContain('email');
    });

    it('should return 400 when category does not exist', async () => {
      vi.mocked(prisma.categories.findUnique).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users',
        body: {
          ...validUserData,
          role: 'judge',
          category_ids: [999],
        },
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('Categoría');
    });
  });
});
