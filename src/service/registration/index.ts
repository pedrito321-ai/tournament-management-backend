export { joinTournament } from './join.service';
export { getRegistrations } from './get-list.service';
export {
  validateIsCompetitor,
  validateCompetitorClub,
  validateClubAllowedInTournament,
  validateNoOtherClubMember,
  validateRobotCategory,
  validateTournamentNotFull,
  validateCompetitorNotBlocked,
  validateTournamentOpenForRegistration,
  validateNotAlreadyRegistered,
} from './validator';
