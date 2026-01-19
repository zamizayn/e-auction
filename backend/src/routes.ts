import { Router } from 'express';
import { sequelize } from './db';
import { Config, Team, Player, Game } from './models';

const router = Router();

// --- Auth ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password123') {
        res.json({ success: true, token: 'admin-token' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// --- Config ---
router.get('/config', async (req, res) => {
    let config = await Config.findOne();
    if (!config) {
        config = await Config.create();
    }
    res.json(config);
});

router.put('/config', async (req, res) => {
    const { id, ...data } = req.body;
    // id is strict number in Config model
    await Config.update(data, { where: { id: Number(id) } });
    const updated = await Config.findByPk(Number(id));
    res.json(updated);
});

// --- Teams ---
router.get('/teams', async (req, res) => {
    const teams = await Team.findAll({
        include: [{ model: Player, as: 'players' }],
        order: [['createdAt', 'ASC']]
    });
    res.json(teams);
});

router.post('/teams', async (req, res) => {
    const { name, purse } = req.body;
    const team = await Team.create({
        name,
        purse,
        spent: 0,
        matchesPlayed: 0,
        won: 0,
        lost: 0,
        tie: 0,
        points: 0,
        nrr: 0.0
    });
    // Return with empty players for frontend consistency if needed
    // But basic create return is fine usually
    res.json(team);
});

router.patch('/teams/:id', async (req, res) => {
    const { id } = req.params;
    const { matchesPlayed, won, lost, tie, points, nrr } = req.body;
    try {
        await Team.update(
            { matchesPlayed, won, lost, tie, points, nrr },
            { where: { id } }
        );
        const team = await Team.findByPk(id);
        res.json(team);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update team' });
    }
});

// --- Players ---
router.get('/players', async (req, res) => {
    const players = await Player.findAll({
        order: [['createdAt', 'ASC']]
    });
    res.json(players);
});

router.post('/players', async (req, res) => {
    const player = await Player.create(req.body);
    res.json(player);
});

router.post('/players/import', async (req, res) => {
    const players = req.body; // Array of players
    // Sequelize bulkCreate
    const created = await Player.bulkCreate(players.map((p: any) => ({
        name: p.name,
        category: p.category,
        gender: p.gender,
        position: p.position,
        employee_no: p.employee_no,
        basePrice: p.basePrice,
        isSold: false
    })));
    res.json(created);
});

router.delete('/players/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Player.destroy({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete player' });
    }
});

// --- Auction Actions ---
router.post('/players/:id/sell', async (req, res) => {
    const { id } = req.params;
    const { teamId, soldPrice } = req.body;

    try {
        const result = await sequelize.transaction(async (t) => {
            // 1. Get Team
            const team = await Team.findByPk(teamId, { transaction: t });
            if (!team) throw new Error('Team not found');

            // 2. Update Team
            team.purse = team.purse - soldPrice;
            team.spent = team.spent + soldPrice;
            await team.save({ transaction: t });

            // 3. Update Player
            const player = await Player.findByPk(id, { transaction: t });
            if (!player) throw new Error('Player not found');

            player.isSold = true;
            player.soldPrice = soldPrice;
            player.teamId = teamId;
            await player.save({ transaction: t });

            return { team, player };
        });

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// --- Reset / Seed ---
router.post('/reset', async (req, res) => {
    // Clear all data
    await Player.destroy({ where: {}, truncate: false }); // truncate: true might be faster but check FK constraints
    await Team.destroy({ where: {}, truncate: false });

    // Seed initial data if requested
    const { seed } = req.body;
    if (seed) {
        // Basic initial seed if needed
    }

    res.json({ success: true });
});

router.post('/seed/players', async (req, res) => {
    try {
        const count = req.body.count || 20;
        const positions = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];
        const categories = ['Standard', 'Premium'];
        const genders = ['Male', 'Female'];

        const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Rohan', 'Ishaan', 'Zara', 'Diya', 'Ananya', 'Priya', 'Kavya', 'Sanya', 'Myra'];
        const lastNames = ['Sharma', 'Verma', 'Singh', 'Patel', 'Reddy', 'Kumar', 'Das', 'Gupta', 'Rao', 'Nair'];

        const players = [];

        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const category = Math.random() > 0.8 ? 'Premium' : 'Standard';

            players.push({
                name: `${firstName} ${lastName}`,
                category: category,
                gender: genders[Math.floor(Math.random() * genders.length)],
                position: positions[Math.floor(Math.random() * positions.length)],
                employee_no: `EMP${1000 + i}`,
                basePrice: category === 'Premium' ? 2000000 : 500000,
                isSold: false
            });
        }

        await Player.bulkCreate(players);
        res.json({ success: true, count: players.length, message: `Seeded ${players.length} players` });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Games ---
router.get('/games', async (req, res) => {
    const games = await Game.findAll({
        order: [['createdAt', 'ASC']]
    });
    res.json(games);
});

router.post('/games', async (req, res) => {
    const { name, type, pointsFirst, pointsSecond, pointsThird } = req.body;
    const game = await Game.create({
        name,
        type: type || 'Team Match',
        pointsFirst: pointsFirst || 2,
        pointsSecond: pointsSecond || 0,
        pointsThird: pointsThird || 0
    });
    res.json(game);
});

router.delete('/games/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Game.destroy({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete game' });
    }
});

export default router;
