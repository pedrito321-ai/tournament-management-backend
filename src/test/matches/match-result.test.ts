import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/matches/[id]/result/route';
import { createMockRequest, createAuthenticatedRequest, createMockParams } from '@/test/helpers/request';
import {
  adminToken,
  competitorToken,
  judgeToken,
  mockMatch,
  mockFinishedMatch,
} from '@/test/helpers/fixtures';

// Mock match service
vi.mock('@/service/match', () => ({
  setMatchResult: vi.fn().mockResolvedValue({
    id: 1,
    winner_id: 10,
    status: 'finished',
    victory_type: 'knockout',
  }),
  validateMatchExists: vi.fn().mockResolvedValue({
    error: null,
    match: {
      id: 1,
      competitor_a: 10,
      competitor_b: 11,
      status: 'pending',
      judge_id: 3,
      tournament: { id: 2, status: 'active' },
    },
  }),
  validateWinnerIsParticipant: vi.fn().mockReturnValue({ error: null }),
  validateMatchNotFinished: vi.fn().mockReturnValue({ error: null }),
  validateCanSetResult: vi.fn().mockResolvedValue({ error: null }),
  validateTournamentIsActive: vi.fn().mockReturnValue({ error: null }),
}));

import {
  setMatchResult,
  validateMatchExists,
  validateWinnerIsParticipant,
  validateMatchNotFinished,
  validateCanSetResult,
  validateTournamentIsActive,
} from '@/service/match';

// Note: All validation functions are used in beforeEach for mocking

describe('PATCH /api/matches/:id/result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateMatchExists).mockResolvedValue({
      match: mockMatch,
    });
    vi.mocked(validateMatchNotFinished).mockReturnValue({});
    vi.mocked(validateTournamentIsActive).mockReturnValue({});
    vi.mocked(validateCanSetResult).mockResolvedValue({});
    vi.mocked(validateWinnerIsParticipant).mockReturnValue({});
  });

  const validResultData = {
    winner_id: 10,
    victory_type: 'knockout',
  };

  describe('Successful Result Registration', () => {
    it('should return 200 when judge registers result', async () => {
      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(200);
      expect(json.message).toBe('Resultado registrado exitosamente');
      expect(json.data).toBeDefined();
    });

    it('should return 200 when admin registers result', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(200);
    });

    it('should call setMatchResult with correct data', async () => {
      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: validResultData,
      });

      await PATCH(request, createMockParams({ id: '1' }));

      expect(setMatchResult).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 1,
          winner_id: validResultData.winner_id,
          victory_type: validResultData.victory_type,
        })
      );
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(401);
      expect(json.message).toContain('token');
    });
  });

  describe('Authorization - Judge or Admin Only', () => {
    it('should return 403 when competitor tries to register result', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('jueces');
    });
  });

  describe('Match Validation', () => {
    it('should return 404 when match does not exist', async () => {
      vi.mocked(validateMatchExists).mockResolvedValue({
        error: 'El combate no existe',
        status: 404,
      });

      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/999/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '999' }));
      const json = await response?.json();

      expect(response?.status).toBe(404);
      expect(json.error).toContain('combate');
    });

    it('should return 400 when match is already finished', async () => {
      vi.mocked(validateMatchExists).mockResolvedValue({
        match: mockFinishedMatch,
      });
      vi.mocked(validateMatchNotFinished).mockReturnValue({
        error: 'El combate ya ha finalizado',
        status: 400,
      });

      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/2/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '2' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('finalizado');
    });

    it('should return 400 for invalid ID format', async () => {
      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/invalid/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: 'invalid' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('número válido');
    });
  });

  describe('Tournament Validation', () => {
    it('should return 400 when tournament is not active', async () => {
      vi.mocked(validateTournamentIsActive).mockReturnValue({
        error: 'El torneo no está activo',
        status: 400,
      });

      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('activo');
    });
  });

  describe('Winner Validation', () => {
    it('should return 400 when winner is not a participant', async () => {
      vi.mocked(validateWinnerIsParticipant).mockReturnValue({
        error: 'El ganador debe ser uno de los participantes del combate',
        status: 400,
      });

      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: {
          winner_id: 999, // Invalid winner
          victory_type: 'knockout',
        },
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('participantes');
    });

    it('should accept competitor_a as winner', async () => {
      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: {
          winner_id: 10, // competitor_a
          victory_type: 'points',
        },
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(200);
    });

    it('should accept competitor_b as winner', async () => {
      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: {
          winner_id: 11, // competitor_b
          victory_type: 'points',
        },
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(200);
    });
  });

  describe('Judge Permission', () => {
    it('should return 403 when judge is not assigned to match', async () => {
      vi.mocked(validateCanSetResult).mockResolvedValue({
        error: 'No tienes permiso para registrar resultados en este combate',
        status: 403,
      });

      const request = createAuthenticatedRequest(judgeToken, {
        method: 'PATCH',
        url: 'http://localhost:3000/api/matches/1/result',
        body: validResultData,
      });

      const response = await PATCH(request, createMockParams({ id: '1' }));

      expect(response?.status).toBe(403);
    });
  });
});
