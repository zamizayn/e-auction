
import { sequelize } from './db';
import { Game } from './models';

const GAMES_TO_SEED = [
    // Cricket
    { name: 'Cricket Team', sport: 'Cricket', type: 'Team', pointsFirst: 10, pointsSecond: 0, pointsThird: 0 },
    { name: 'French Cricket', sport: 'French Cricket', type: 'Single', pointsFirst: 5, pointsSecond: 3, pointsThird: 1 },

    // Football
    { name: 'Football 5s', sport: 'Football', type: 'Team', pointsFirst: 10, pointsSecond: 0, pointsThird: 0 },

    // Badminton
    { name: 'Badminton Singles', sport: 'Badminton', type: 'Single', pointsFirst: 5, pointsSecond: 3, pointsThird: 1 },
    { name: 'Badminton Doubles', sport: 'Badminton', type: 'Doubles', pointsFirst: 5, pointsSecond: 3, pointsThird: 1 },
    { name: 'Badminton Mixed Doubles', sport: 'Badminton', type: 'Mixed Doubles', pointsFirst: 5, pointsSecond: 3, pointsThird: 1 },

    // Caroms
    { name: 'Caroms Singles', sport: 'Caroms', type: 'Single', pointsFirst: 3, pointsSecond: 1, pointsThird: 0 },
    { name: 'Caroms Doubles', sport: 'Caroms', type: 'Doubles', pointsFirst: 3, pointsSecond: 1, pointsThird: 0 },

    // Chess
    { name: 'Chess', sport: 'Chess', type: 'Single', pointsFirst: 5, pointsSecond: 3, pointsThird: 1 },

    // Snake & Ladder
    { name: 'Snake & Ladder', sport: 'Snake & Ladder', type: 'Single', pointsFirst: 3, pointsSecond: 1, pointsThird: 0 },

    // Ludo
    { name: 'Ludo', sport: 'Ludo', type: 'Single', pointsFirst: 3, pointsSecond: 1, pointsThird: 0 },

    // Jenga
    { name: 'Jenga', sport: 'Jenga', type: 'Single', pointsFirst: 3, pointsSecond: 1, pointsThird: 0 },

    // Dart
    { name: 'Dart', sport: 'Dart', type: 'Single', pointsFirst: 3, pointsSecond: 1, pointsThird: 0 },
];

async function seedGames() {
    try {
        await sequelize.sync(); // Ensure tables make sense
        console.log('--- Seeding Games ---');

        for (const g of GAMES_TO_SEED) {
            const existing = await Game.findOne({ where: { name: g.name } });
            if (!existing) {
                await Game.create(g);
                console.log(`Created: ${g.name}`);
            } else {
                // Update existing game to ensure sport/type are correct
                await existing.update({
                    sport: g.sport,
                    type: g.type,
                    pointsFirst: g.pointsFirst,
                    pointsSecond: g.pointsSecond,
                    pointsThird: g.pointsThird
                });
                console.log(`Updated: ${g.name}`);
            }
        }

        console.log('--- Done ---');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        // await sequelize.close(); // Don't close if imported elsewhere, but for script it's fine
    }
}

// Run if called directly
if (require.main === module) {
    seedGames();
}
