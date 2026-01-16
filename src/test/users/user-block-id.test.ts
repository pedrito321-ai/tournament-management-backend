import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/users/blocks/[id]/route';
import { createMockRequest, createAuthenticatedRequest, createMockParams } from '@/test/helpers/request';
import prisma from '@/libs/prisma';
import {
  adminToken,
  competitorToken,
  mockUserBlock,
} from '@/test/helpers/fixtures';

describe('GET /api/users/blocks/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user_blocks.findFirst).mockResolvedValue(mockUserBlock as never);
  });

  describe('Get Block by ID - Admin Only', () => {
    it('should return block when admin requests', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks/1',
      });

      const response = await GET(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toContain('Bloqueo encontrado');
      expect(json.data).toBeDefined();
    });

    it('should return 404 when block does not exist', async () => {
      vi.mocked(prisma.user_blocks.findFirst).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks/999',
      });

      const response = await GET(request, createMockParams({ id: '999' }));
      const json = await response?.json();

      expect(response?.status).toBe(404);
      expect(json.error).toContain('No existe');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks/1',
      });

      const response = await GET(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(401);
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when non-admin requests block', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks/1',
      });

      const response = await GET(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid ID format', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/blocks/invalid',
      });

      const response = await GET(request, createMockParams({ id: 'invalid' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('número válido');
    });
  });
});

describe('PATCH /api/users/blocks/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user_blocks.findUnique).mockResolvedValue(mockUserBlock as never);
    vi.mocked(prisma.user_blocks.update).mockResolvedValue({
      ...mockUserBlock,
      status: 'lifted',
    } as never);
    vi.mocked(prisma.users.update).mockResolvedValue({} as never);
  });

  describe('Successful Update', () => {
    it('should return 200 when admin updates block status to lifted', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/blocks/1',
        body: { status: 'lifted' },
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toContain('Estado del bloqueo actualizado');
    });

    it('should activate user when status is lifted', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/blocks/1',
        body: { status: 'lifted' },
      });

      await PATCH(request, createMockParams({ id: '1' }));

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { is_active: true },
        })
      );
    });

    it('should deactivate user when status is active', async () => {
      vi.mocked(prisma.user_blocks.update).mockResolvedValue({
        ...mockUserBlock,
        status: 'active',
      } as never);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/blocks/1',
        body: { status: 'active' },
      });

      await PATCH(request, createMockParams({ id: '1' }));

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { is_active: false },
        })
      );
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/blocks/1',
        body: { status: 'lifted' },
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(401);
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when non-admin tries to update', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/blocks/1',
        body: { status: 'lifted' },
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('Block Validation', () => {
    it('should return 404 when block does not exist', async () => {
      vi.mocked(prisma.user_blocks.findUnique).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/blocks/999',
        body: { status: 'lifted' },
      });

      const response = await PATCH(request, createMockParams({ id: '999' }));
      const json = await response?.json();

      expect(response?.status).toBe(404);
      expect(json.error).toContain('No existe');
    });

    it('should return 400 for invalid ID format', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/blocks/abc',
        body: { status: 'lifted' },
      });

      const response = await PATCH(request, createMockParams({ id: 'abc' }));

      expect(response?.status).toBe(400);
    });
  });
});
