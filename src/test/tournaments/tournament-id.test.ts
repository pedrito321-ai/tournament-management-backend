import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/tournaments/[id]/route';
import { createMockRequest, createAuthenticatedRequest, createMockParams } from '@/test/helpers/request';
import {
  adminToken,
  competitorToken,
  mockTournament,
  mockActiveTournament,
} from '@/test/helpers/fixtures';

// Mock tournament service
vi.mock('@/service/tournament', () => ({
  getTournament: vi.fn(),
  updateTournament: vi.fn().mockResolvedValue({ id: 1, name: 'Updated Tournament' }),
  cancelTournament: vi.fn().mockResolvedValue({ id: 1, status: 'cancelled' }),
  validateTournamentExists: vi.fn().mockResolvedValue({ error: null, tournament: { id: 1, status: 'draft' } }),
  validateTournamentIsDraft: vi.fn().mockResolvedValue({ error: null }),
}));

import {
  getTournament,
  validateTournamentExists,
  validateTournamentIsDraft,
} from '@/service/tournament';

describe('GET /api/tournaments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Get Tournament by ID', () => {
    it('should return tournament when it exists', async () => {
      vi.mocked(getTournament).mockResolvedValue(mockTournament);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments/1',
      });

      const response = await GET(request, createMockParams({ id: '1' }));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toBe('Torneo obtenido exitosamente');
      expect(json.data).toBeDefined();
    });

    it('should return 404 when tournament does not exist', async () => {
      vi.mocked(getTournament).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments/999',
      });

      const response = await GET(request, createMockParams({ id: '999' }));
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toContain('no existe');
    });

    it('should return 400 for invalid ID format', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments/invalid',
      });

      const response = await GET(request, createMockParams({ id: 'invalid' }));
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('número válido');
    });
  });
});

describe('PATCH /api/tournaments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateTournamentExists).mockResolvedValue({ tournament: mockTournament });
    vi.mocked(validateTournamentIsDraft).mockResolvedValue({});
  });

  const updateData = {
    name: 'Updated Tournament Name',
    description: 'Updated description',
  };

  describe('Successful Update', () => {
    it('should return 200 when admin updates tournament', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/tournaments/1',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toBe('Torneo actualizado exitosamente');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/tournaments/1',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(401);
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when competitor tries to update', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/tournaments/1',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('Tournament Validation', () => {
    it('should return 404 when tournament does not exist', async () => {
      vi.mocked(validateTournamentExists).mockResolvedValue({
        error: 'El torneo no existe',
        status: 404,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/tournaments/999',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '999' }));

      expect(response?.status).toBe(404);
    });

    it('should return 400 when tournament is not in draft status', async () => {
      vi.mocked(validateTournamentExists).mockResolvedValue({ tournament: mockActiveTournament });
      vi.mocked(validateTournamentIsDraft).mockResolvedValue({
        error: 'Solo se pueden editar torneos en estado borrador',
        status: 400,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/tournaments/2',
        body: updateData,
      });

      const response = await PATCH(request, createMockParams({ id: '2' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('borrador');
    });
  });
});

describe('DELETE /api/tournaments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateTournamentExists).mockResolvedValue({ tournament: mockTournament });
  });

  describe('Successful Cancellation', () => {
    it('should return 200 when admin cancels tournament', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/tournaments/1',
      });

      const response = await DELETE(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toBe('Torneo cancelado exitosamente');
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/tournaments/1',
      });

      const response = await DELETE(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(401);
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when non-admin tries to cancel', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/tournaments/1',
      });

      const response = await DELETE(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('Tournament Validation', () => {
    it('should return 404 when tournament does not exist', async () => {
      vi.mocked(validateTournamentExists).mockResolvedValue({
        error: 'El torneo no existe',
        status: 404,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/tournaments/999',
      });

      const response = await DELETE(request, createMockParams({ id: '999' }));

      expect(response?.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'DELETE',
        url: 'http://localhost:3000/api/tournaments/abc',
      });

      const response = await DELETE(request, createMockParams({ id: 'abc' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('número válido');
    });
  });
});
