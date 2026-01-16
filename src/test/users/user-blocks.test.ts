import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/blocks/route';
import { createMockRequest, createAuthenticatedRequest } from '@/test/helpers/request';
import prisma from '@/libs/prisma';
import {
  adminToken,
  competitorToken,
  mockUserBlock,
  mockCompetitorUser,
} from '@/test/helpers/fixtures';

describe('GET /api/users/blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user_blocks.findMany).mockResolvedValue([mockUserBlock] as never);
  });

  describe('List Blocks - Admin Only', () => {
    it('should return list of blocks when admin requests', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks?skip=0&take=10',
      });

      const response = await GET(request);
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toContain('Bloqueos obtenidos');
      expect(json.data).toBeDefined();
    });

    it('should accept pagination parameters', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks?skip=5&take=20',
      });

      await GET(request);

      expect(prisma.user_blocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 20,
        })
      );
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks?skip=0&take=10',
      });

      const response = await GET(request);

      expect(response?.status).toBe(401);
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when non-admin requests blocks', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks?skip=0&take=10',
      });

      const response = await GET(request);
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid skip parameter', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks?skip=-1&take=10',
      });

      const response = await GET(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('skip');
    });
  });
});

describe('POST /api/users/blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockCompetitorUser);
    vi.mocked(prisma.user_blocks.create).mockResolvedValue(mockUserBlock as never);
  });

  const validBlockData = {
    user_id: 5,
    reason: 'Violation of rules',
  };

  describe('Successful Block Creation', () => {
    it('should return 201 when admin creates block', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users/blocks',
        body: validBlockData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(201);
      expect(json.message).toContain('Solicitud de bloqueo registrada');
      expect(json.userLock).toBeDefined();
    });

    it('should create block with correct data', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users/blocks',
        body: validBlockData,
      });

      await POST(request);

      expect(prisma.user_blocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: validBlockData.user_id,
            reason: validBlockData.reason,
          }),
        })
      );
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/users/blocks',
        body: validBlockData,
      });

      const response = await POST(request);

      expect(response?.status).toBe(401);
    });
  });

  describe('User Validation', () => {
    it('should return 404 when user to block does not exist', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users/blocks',
        body: { ...validBlockData, user_id: 999 },
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(404);
      expect(json.error).toContain('Usuario no encontrado');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing required fields', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/users/blocks',
        body: { user_id: 5 }, // Missing reason
      });

      const response = await POST(request);

      expect(response?.status).toBe(400);
    });
  });
});
