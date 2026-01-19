import { Team } from './Team';
import { Player } from './Player';
import { Config } from './Config';
import { Game } from './Game';
import { Match } from './Match';

// Setup Associations
Team.hasMany(Player, { foreignKey: 'teamId', as: 'players' });
Player.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });

Match.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });
Match.belongsTo(Team, { foreignKey: 'teamAId', as: 'teamA' });
Match.belongsTo(Team, { foreignKey: 'teamBId', as: 'teamB' });

export {
    Team,
    Player,
    Config,
    Game,
    Match
};
