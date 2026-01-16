import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/tournaments/route';
import { createMockRequest, createAuthenticatedRequest } from '@/test/helpers/request';
import {
  adminToken,
  competitorToken,
} from '@/test/helpers/fixtures';

// Mock tournament service
vi.mock('@/service/tournament', () => ({
  getTournaments: vi.fn().mockResolvedValue({
    total: 1,
    tournaments: [{ id: 1, name: 'Test Tournament', status: 'draft' }],
  }),
  createTournament: vi.fn().mockResolvedValue({
    id: 1,
    name: 'New Tournament',
    status: 'draft',
  }),
  validateCategoryExists: vi.fn().mockResolvedValue({ error: null }),
  validateJudgeForTournament: vi.fn().mockResolvedValue({ error: null }),
  validateAllowedClubs: vi.fn().mockResolvedValue({ error: null }),
}));

import {
  getTournaments,
  createTournament,
  validateCategoryExists,
  validateJudgeForTournament,
  validateAllowedClubs,
} from '@/service/tournament';

describe('GET /api/tournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('List Tournaments', () => {
    it('should return list of tournaments with default pagination', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toBe('Torneos obtenidos exitosamente');
      expect(json.total).toBeDefined();
      expect(json.data).toBeDefined();
    });

    it('should accept skip and take parameters', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments?skip=10&take=5',
      });

      await GET(request);

      expect(getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        })
      );
    });

    it('should accept status filter', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments?status=active',
      });

      await GET(request);

      expect(getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should accept category_id filter', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments?category_id=1',
      });

      await GET(request);

      expect(getTournaments).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: 1,
        })
      );
    });

    it('should return 400 for invalid skip parameter', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments?skip=-1',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('skip');
    });

    it('should return 400 for invalid take parameter', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tournaments?take=0',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('take');
    });
  });
});

describe('POST /api/tournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateCategoryExists).mockResolvedValue({ error: undefined });
    vi.mocked(validateJudgeForTournament).mockResolvedValue({ error: undefined });
    vi.mocked(validateAllowedClubs).mockResolvedValue({ error: undefined });
  });

  const validTournamentData = {
    name: 'New Tournament',
    description: 'A new tournament',
    start_date: '2024-06-01',
    end_date: '2024-06-02',
    category_id: 1,
    judge_id: 3,
    max_participants: 16,
    allowed_club_ids: [1, 2],
  };

  describe('Successful Creation', () => {
    it('should return 201 when admin creates tournament', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: validTournamentData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(201);
      expect(json.message).toBe('Torneo creado exitosamente');
      expect(json.data).toBeDefined();
    });

    it('should call createTournament with correct data', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: validTournamentData,
      });

      await POST(request);

      expect(createTournament).toHaveBeenCalled();
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: validTournamentData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(401);
      expect(json.message).toContain('token');
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when competitor tries to create tournament', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: validTournamentData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 when category does not exist', async () => {
      vi.mocked(validateCategoryExists).mockResolvedValue({
        error: 'La categoría no existe',
        status: 404,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: validTournamentData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(404);
      expect(json.error).toBe('La categoría no existe');
    });

    it('should return 400 when judge is invalid', async () => {
      vi.mocked(validateJudgeForTournament).mockResolvedValue({
        error: 'El juez no es válido para esta categoría',
        status: 400,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: validTournamentData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('juez');
    });

    it('should return 400 when clubs are invalid', async () => {
      vi.mocked(validateAllowedClubs).mockResolvedValue({
        error: 'Algunos clubes no existen o no están aprobados',
        status: 400,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: validTournamentData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('clubes');
    });

    it('should return 400 for missing required fields', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments',
        body: {
          name: 'Only Name',
        },
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toBeDefined();
    });
  });
});
