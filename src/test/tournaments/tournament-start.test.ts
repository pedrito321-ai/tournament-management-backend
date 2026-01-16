import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tournaments/[id]/start/route';
import { createMockRequest, createAuthenticatedRequest, createMockParams } from '@/test/helpers/request';
import prisma from '@/libs/prisma';
import {
  adminToken,
  competitorToken,
  judgeToken,
  mockTournament,
  mockActiveTournament,
} from '@/test/helpers/fixtures';

// Mock tournament service
vi.mock('@/service/tournament', () => ({
  validateTournamentExists: vi.fn().mockResolvedValue({
    error: null,
    tournament: { id: 1, status: 'draft', category_id: 1 },
  }),
}));

// Mock match service
vi.mock('@/service/match', () => ({
  generateBrackets: vi.fn().mockResolvedValue({
    matches: [{ id: 1 }, { id: 2 }],
    totalCompetitors: 4,
  }),
  getTournamentJudge: vi.fn().mockResolvedValue({ id: 3, name: 'Judge' }),
}));

import { validateTournamentExists } from '@/service/tournament';
import { getTournamentJudge, generateBrackets } from '@/service/match';

describe('POST /api/tournaments/:id/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateTournamentExists).mockResolvedValue({
      tournament: mockTournament,
    });
    vi.mocked(prisma.tournament_registrations.count).mockResolvedValue(4);
    vi.mocked(getTournamentJudge).mockResolvedValue({
      id: 3,
      user_id: 100,
      is_approved: true,
      approved_by: 1,
      approved_at: new Date(),
    });
  });

  describe('Successful Tournament Start', () => {
    it('should return 200 when admin starts tournament', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/1/start',
      });

      const response = await POST(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toContain('Torneo iniciado exitosamente');
      expect(json.data.matches).toBeDefined();
      expect(json.data.totalCompetitors).toBeDefined();
    });

    it('should call generateBrackets with correct parameters', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/1/start',
      });

      await POST(request, createMockParams({ id: '1' }));

      expect(generateBrackets).toHaveBeenCalledWith(
        expect.objectContaining({
          tournamentId: 1,
          judgeId: 3,
        })
      );
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/1/start',
      });

      const response = await POST(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(401);
      expect(json.message).toContain('token');
    });
  });

  describe('Authorization - Admin Only', () => {
    it('should return 403 when competitor tries to start tournament', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/1/start',
      });

      const response = await POST(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('administradores');
    });

    it('should return 403 when judge tries to start tournament', async () => {
      const request = createAuthenticatedRequest(judgeToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/1/start',
      });

      const response = await POST(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(403);
    });
  });

  describe('Tournament Validation', () => {
    it('should return 404 when tournament does not exist', async () => {
      vi.mocked(validateTournamentExists).mockResolvedValue({
        error: 'El torneo no existe',
        status: 404,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/999/start',
      });

      const response = await POST(request, createMockParams({ id: '999' }));

      expect(response?.status).toBe(404);
    });

    it('should return 400 when tournament is not in draft status', async () => {
      vi.mocked(validateTournamentExists).mockResolvedValue({
        error: undefined,
        tournament: mockActiveTournament,
      });

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/2/start',
      });

      const response = await POST(request, createMockParams({ id: '2' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('borrador');
    });

    it('should return 400 when tournament has less than 2 registrations', async () => {
      vi.mocked(prisma.tournament_registrations.count).mockResolvedValue(1);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/1/start',
      });

      const response = await POST(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('inscripciones');
    });

    it('should return 400 when no judge is assigned', async () => {
      vi.mocked(getTournamentJudge).mockResolvedValue(null);

      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/1/start',
      });

      const response = await POST(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('juez');
    });

    it('should return 400 for invalid ID format', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/invalid/start',
      });

      const response = await POST(request, createMockParams({ id: 'invalid' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('número válido');
    });
  });
});
