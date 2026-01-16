import jwt from 'jsonwebtoken';

// ============================================================================
// Users
// ============================================================================

export const mockAdminUser = {
  id: 1,
  name: 'Admin',
  lastName: 'User',
  nickname: 'admin_user',
  email: 'admin@test.com',
  user_password: 'hashed-password',
  role: 'admin' as const,
  is_active: true,
  age: 30,
  profile_picture: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  judges: [],
  club_owner: null,
  competitor: null,
};

export const mockCompetitorUser = {
  id: 2,
  name: 'Competitor',
  lastName: 'User',
  nickname: 'competitor_user',
  email: 'competitor@test.com',
  user_password: 'hashed-password',
  role: 'competitor' as const,
  is_active: true,
  age: 25,
  profile_picture: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockJudgeUser = {
  id: 3,
  name: 'Judge',
  lastName: 'User',
  nickname: 'judge_user',
  email: 'judge@test.com',
  user_password: 'hashed-password',
  role: 'judge' as const,
  is_active: true,
  age: 35,
  profile_picture: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockClubOwnerUser = {
  id: 4,
  name: 'ClubOwner',
  lastName: 'User',
  nickname: 'club_owner_user',
  email: 'clubowner@test.com',
  user_password: 'hashed-password',
  role: 'club_owner' as const,
  is_active: true,
  age: 40,
  profile_picture: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockInactiveUser = {
  id: 5,
  name: 'Inactive',
  lastName: 'User',
  nickname: 'inactive_user',
  email: 'inactive@test.com',
  user_password: 'hashed-password',
  role: 'competitor' as const,
  is_active: false,
  age: 25,
  profile_picture: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tokens
// ============================================================================

export function generateToken(payload: { id: number; role: string; email: string; nickname?: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: 3600 });
}

export const adminToken = generateToken({
  id: mockAdminUser.id,
  role: mockAdminUser.role,
  email: mockAdminUser.email,
  nickname: mockAdminUser.nickname,
});

export const competitorToken = generateToken({
  id: mockCompetitorUser.id,
  role: mockCompetitorUser.role,
  email: mockCompetitorUser.email,
  nickname: mockCompetitorUser.nickname,
});

export const judgeToken = generateToken({
  id: mockJudgeUser.id,
  role: mockJudgeUser.role,
  email: mockJudgeUser.email,
  nickname: mockJudgeUser.nickname,
});

export const clubOwnerToken = generateToken({
  id: mockClubOwnerUser.id,
  role: mockClubOwnerUser.role,
  email: mockClubOwnerUser.email,
  nickname: mockClubOwnerUser.nickname,
});

export const invalidToken = 'invalid-token-string';

// ============================================================================
// Tournaments
// ============================================================================

export const mockTournament = {
  id: 1,
  name: 'Test Tournament',
  description: 'A test tournament',
  start_date: new Date('2024-06-01'),
  end_date: new Date('2024-06-02'),
  status: 'draft' as const,
  category_id: 1,
  max_participants: 16,
  created_by: 1,
  winner_competitor_id: null,
  winner_club_id: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  // RELACIONES INCLUIDAS (obligatorias):
  category: {
    id: 1,
    name: 'Robótica',
    description: 'Categoría de robótica'
  },
  judges: [],
  tournamentClubs: [],
  registrations: [],
  matches: [],
  results: [],
  tournament_prizes: []
};

export const mockActiveTournament = {
  ...mockTournament,
  id: 2,
  name: 'Active Tournament',
  status: 'active' as const,
};

export const mockCancelledTournament = {
  ...mockTournament,
  id: 3,
  name: 'Cancelled Tournament',
  status: 'cancelled' as const,
};

// ============================================================================
// Categories
// ============================================================================

export const mockCategory = {
  id: 1,
  name: 'Lightweight',
  description: 'Robots up to 3kg',
  min_weight: 0,
  max_weight: 3000,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Matches
// ============================================================================

export const mockMatch = {
  id: 1,
  tournament_id: 2, // Active tournament
  round: 1,
  round_number: 1,
  match_order: 1,
  competitor_a: 10,
  competitor_b: 11,
  winner_id: null,
  status: 'pending' as const,
  judge_id: 3,
  combat_duration: 1800,
  duration_sec: 1800,
  victory_type: null as string | null,
  created_at: new Date('2024-01-01'),
  tournament: {
    id: 2,
    status: 'active',
  },
};

export const mockFinishedMatch = {
  ...mockMatch,
  id: 2,
  winner_id: 10,
  status: 'finished' as const,
  victory_type: 'knockout' as string | null,
};

// ============================================================================
// Competitors
// ============================================================================

export const mockCompetitor = {
  id: 2, // Same as mockCompetitorUser.id
  user_id: 2,
  club_id: 1,
  dni: '12345678',
  is_approved: true,
  approved_by: 1,
  approved_at: new Date('2024-01-01'),
  last_tournament_end: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Clubs
// ============================================================================

export const mockClub = {
  id: 1,
  name: 'Test Club',
  description: 'A test club',
  is_approved: true,
  owner_id: 4,
  created_at: new Date('2024-01-01'),
};

export const mockUnapprovedClub = {
  ...mockClub,
  id: 2,
  name: 'Unapproved Club',
  is_approved: false,
};

// ============================================================================
// Robots
// ============================================================================

export const mockRobot = {
  id: 1,
  name: 'Test Robot',
  weight: 2500,
  owner_id: 2,
  category_id: 1,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// User Blocks
// ============================================================================

export const mockUserBlock = {
  id: 1,
  user_id: 5,
  reason: 'Violation of rules',
  status: 'active' as const,
  blocked_by: 1,
  blocked_at: new Date('2024-01-01'),
  unblocked_at: null,
};
