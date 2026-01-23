import { sequelize } from './db';
// Import models to ensure they are registered with sequelize
import './models';
import { Match, Player, Team, Game, Config } from './models';

const clearDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Delete in order to respect foreign key constraints
        console.log('Clearing Match table...');
        await Match.destroy({ where: {}, truncate: true, cascade: true });

        console.log('Clearing Player table...');
        await Player.destroy({ where: {}, truncate: true, cascade: true });

        console.log('Clearing Team table...');
        await Team.destroy({ where: {}, truncate: true, cascade: true });

        console.log('Clearing Game table...');
        await Game.destroy({ where: {}, truncate: true, cascade: true });

        console.log('Clearing Config table...');
        await Config.destroy({ where: {}, truncate: true, cascade: true });

        console.log('Database cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

clearDatabase();
