import { Team } from './Team';
import { Player } from './Player';
import { Config } from './Config';
import { Game } from './Game';

// Setup Associations
Team.hasMany(Player, { foreignKey: 'teamId', as: 'players' });
Player.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });

export {
    Team,
    Player,
    Config,
    Game
};
