import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tournaments/join/route';
import { createMockRequest, createAuthenticatedRequest } from '@/test/helpers/request';
import {
  adminToken,
  competitorToken,
  judgeToken,
  mockTournament,
  mockCompetitor,
} from '@/test/helpers/fixtures';

// Mock tournament service
vi.mock('@/service/tournament', () => ({
  validateTournamentExists: vi.fn().mockResolvedValue({
    tournament: { id: 1, status: 'draft', category_id: 1 },
  }),
}));

// Mock registration service
vi.mock('@/service/registration', () => ({
  joinTournament: vi.fn().mockResolvedValue({
    id: 1,
    tournament_id: 1,
    competitor_id: 2,
    robot_id: 1,
    is_approved: false,
  }),
  validateIsCompetitor: vi.fn().mockResolvedValue({
    competitor: { id: 2, club_id: 1 },
  }),
  validateCompetitorClub: vi.fn().mockResolvedValue({}),
  validateNoOtherClubMember: vi.fn().mockResolvedValue({}),
  validateRobotCategory: vi.fn().mockResolvedValue({}),
  validateTournamentNotFull: vi.fn().mockResolvedValue({}),
  validateCompetitorNotBlocked: vi.fn().mockResolvedValue({}),
  validateTournamentOpenForRegistration: vi.fn().mockResolvedValue({}),
  validateNotAlreadyRegistered: vi.fn().mockResolvedValue({}),
}));

import { validateTournamentExists } from '@/service/tournament';
import {
  joinTournament,
  validateIsCompetitor,
  validateCompetitorClub,
  validateNoOtherClubMember,
  validateRobotCategory,
  validateTournamentNotFull,
  validateCompetitorNotBlocked,
  validateTournamentOpenForRegistration,
  validateNotAlreadyRegistered,
} from '@/service/registration';

describe('POST /api/tournaments/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateTournamentExists).mockResolvedValue({
      tournament: mockTournament,
    });
    vi.mocked(validateIsCompetitor).mockResolvedValue({
      competitor: mockCompetitor,
    });
    vi.mocked(validateCompetitorClub).mockResolvedValue({});
    vi.mocked(validateNoOtherClubMember).mockResolvedValue({});
    vi.mocked(validateRobotCategory).mockResolvedValue({});
    vi.mocked(validateTournamentNotFull).mockResolvedValue({});
    vi.mocked(validateCompetitorNotBlocked).mockResolvedValue({});
    vi.mocked(validateTournamentOpenForRegistration).mockResolvedValue({});
    vi.mocked(validateNotAlreadyRegistered).mockResolvedValue({});
  });

  const validJoinData = {
    tournament_id: 1,
    robot_id: 1,
  };

  describe('Successful Registration', () => {
    it('should return 201 when competitor joins tournament', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(201);
      expect(json.message).toContain('Inscripción realizada exitosamente');
      expect(json.data).toBeDefined();
    });

    it('should call joinTournament with correct data', async () => {
      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      await POST(request);

      expect(joinTournament).toHaveBeenCalledWith(
        expect.objectContaining({
          tournament_id: validJoinData.tournament_id,
          robot_id: validJoinData.robot_id,
        })
      );
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(401);
      expect(json.message).toContain('token');
    });
  });

  describe('Authorization - Competitors Only', () => {
    it('should return 403 when admin tries to join', async () => {
      const request = createAuthenticatedRequest(adminToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('competidores');
    });

    it('should return 403 when judge tries to join', async () => {
      const request = createAuthenticatedRequest(judgeToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);

      expect(response?.status).toBe(403);
    });
  });

  describe('Tournament Validation', () => {
    it('should return 404 when tournament does not exist', async () => {
      vi.mocked(validateTournamentExists).mockResolvedValue({
        error: 'El torneo no existe',
        status: 404,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: { ...validJoinData, tournament_id: 999 },
      });

      const response = await POST(request);

      expect(response?.status).toBe(404);
    });

    it('should return 400 when tournament is not open for registration', async () => {
      vi.mocked(validateTournamentOpenForRegistration).mockResolvedValue({
        error: 'El torneo no está abierto para inscripciones',
        status: 400,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('inscripciones');
    });
  });

  describe('Club Validation', () => {
    it('should return 400 when club is not approved', async () => {
      vi.mocked(validateCompetitorClub).mockResolvedValue({
        error: 'Tu club no está aprobado',
        status: 400,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('club');
    });

    it('should return 409 when another club member is already registered', async () => {
      vi.mocked(validateNoOtherClubMember).mockResolvedValue({
        error: 'Ya hay un miembro de tu club inscrito en este torneo',
        status: 409,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);

      expect(response?.status).toBe(409);
    });
  });

  describe('Robot Validation', () => {
    it('should return 400 when robot category does not match tournament', async () => {
      vi.mocked(validateRobotCategory).mockResolvedValue({
        error: 'El robot no pertenece a la categoría del torneo',
        status: 400,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('categoría');
    });
  });

  describe('Competitor Validation', () => {
    it('should return 403 when competitor is blocked', async () => {
      vi.mocked(validateCompetitorNotBlocked).mockResolvedValue({
        error: 'Tu cuenta está bloqueada',
        status: 403,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(403);
      expect(json.error).toContain('bloqueada');
    });

    it('should return 409 when already registered', async () => {
      vi.mocked(validateNotAlreadyRegistered).mockResolvedValue({
        error: 'Ya estás inscrito en este torneo',
        status: 409,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);

      expect(response?.status).toBe(409);
    });
  });

  describe('Tournament Capacity', () => {
    it('should return 400 when tournament is full', async () => {
      vi.mocked(validateTournamentNotFull).mockResolvedValue({
        error: 'El torneo ya alcanzó el máximo de participantes',
        status: 400,
      });

      const request = createAuthenticatedRequest(competitorToken, {
        method: 'POST',
        url: 'http://localhost:3000/api/tournaments/join',
        body: validJoinData,
      });

      const response = await POST(request);
      const json = await response?.json();

      expect(response?.status).toBe(400);
      expect(json.error).toContain('máximo');
    });
  });
});
