import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/users/[id]/route';
import { createMockRequest, createAuthenticatedRequest, createMockParams } from '@/test/helpers/request';
import prisma from '@/libs/prisma';
import {
  adminToken,
  competitorToken,
  mockAdminUser,
  mockCompetitorUser,
} from '@/test/helpers/fixtures';

// Mock user service
vi.mock('@/service/users', () => ({
  getUser: vi.fn(),
  updateUser: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Updated',
    lastName: 'User',
  }),
}));

vi.mock('@/service/users/user.validator', () => ({
  validateBaseFieldsPermissions: vi.fn().mockReturnValue(null),
  validateClubOwnerPermissions: vi.fn().mockReturnValue(null),
  validateCompetitorPermissions: vi.fn().mockReturnValue(null),
  validateJudgePermissions: vi.fn().mockResolvedValue(null),
}));

import { getUser } from '@/service/users';
import {
  validateBaseFieldsPermissions,
  validateCompetitorPermissions,
  validateClubOwnerPermissions,
  validateJudgePermissions,
} from '@/service/users/user.validator';

describe('GET /api/users/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Get User by ID', () => {
    it('should return user when authenticated and user exists', async () => {
      vi.mocked(getUser).mockResolvedValue(mockAdminUser);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/1',
      });

      const response = await GET(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.id).toBe(mockAdminUser.id);
    });

    it('should return 404 when user does not exist', async () => {
      vi.mocked(getUser).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/999',
      });

      const response = await GET(request, createMockParams({ id: '999' }));
      const json = await response?.json();

      expect(response?.status).toBe(404);
      expect(json.error).toContain('no existe');
    });

    it('should return 400 for invalid ID format', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'GET',
        url: 'http://localhost:3000/api/users/invalid',
      });

      const response = await GET(request, createMockParams({ id: 'invalid' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('número válido');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/users/1',
      });

      const response = await GET(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(401);
    });
  });
});

describe('PATCH /api/users/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      ...mockCompetitorUser,
      club_owner: null,
      competitor: null,
      judges: null,
    } as never);
    vi.mocked(validateBaseFieldsPermissions).mockReturnValue(undefined);
    vi.mocked(validateCompetitorPermissions).mockReturnValue(undefined);
    vi.mocked(validateClubOwnerPermissions).mockReturnValue(undefined);
    vi.mocked(validateJudgePermissions).mockResolvedValue(undefined);
  });

  const updateData = {
    name: 'Updated Name',
  };

  describe('Successful Update', () => {
    it('should return 200 when user updates own profile', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        ...mockCompetitorUser,
        club_owner: null,
        competitor: null,
        judges: null,
      } as never);

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/2',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '2' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toContain('actualizado correctamente');
    });

    it('should return 200 when admin updates any user', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/2',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '2' }));

      expect(response?.status).toBe(200);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/1',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(401);
    });
  });

  describe('User Validation', () => {
    it('should return 404 when user to edit does not exist', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/999',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '999' }));
      const json = await response?.json();

      expect(response?.status).toBe(404);
      expect(json.error).toContain('no existe');
    });
  });

  describe('Permission Validation', () => {
    it('should return error when base field permissions fail', async () => {
      vi.mocked(validateBaseFieldsPermissions).mockReturnValue({
        error: 'No tienes permiso para editar este campo',
        status: 403,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/users/1',
        body: { role: 'admin' },
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(403);
    });
  });
});

describe('DELETE /api/users/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockCompetitorUser);
    vi.mocked(prisma.users.delete).mockResolvedValue(mockCompetitorUser);
  });

  describe('Successful Deletion', () => {
    it('should return 200 when admin deletes user', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/users/2',
      });

      const response = await DELETE(request, createMockParams({ id: '2' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toContain('eliminado correctamente');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/users/2',
      });

      const response = await DELETE(request, createMockParams({ id: '2' }));

      expect(response?.status).toBe(401);
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when non-admin tries to delete', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/users/1',
      });

      const response = await DELETE(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('User Validation', () => {
    it('should return 400 when user does not exist', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/users/999',
      });

      const response = await DELETE(request, createMockParams({ id: '999' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('no existe');
    });

    it('should return 400 for invalid ID format', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/users/abc',
      });

      const response = await DELETE(request, createMockParams({ id: 'abc' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('número válido');
    });
  });
});
