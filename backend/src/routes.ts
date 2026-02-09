import { Router } from 'express';
import { Op } from 'sequelize';
import { sequelize } from './db';
import { Config, Team, Player, Game, Match } from './models';

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
    const { name, purse, logo, captainId } = req.body;
    const team = await Team.create({
        name,
        purse,
        logo,
        captainId,
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
    const { matchesPlayed, won, lost, tie, points, nrr, logo, captainId } = req.body;
    try {
        const team = await Team.findByPk(id);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        // If captainId is changing, update the player
        if (captainId && captainId !== team.captainId) {
            const player = await Player.findByPk(captainId);
            if (player) {
                // If player was already sold or on another team, we might want to handle it
                // For now, force assign as captain
                await player.update({
                    teamId: id,
                    isSold: true,
                    soldPrice: player.basePrice // Captains sold at base price
                });
            }
        }

        await team.update({ matchesPlayed, won, lost, tie, points, nrr, logo, captainId });
        const updatedTeam = await Team.findByPk(id, { include: ['players'] });
        res.json(updatedTeam);
    } catch (error) {
        console.error(error);
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
        gameIds: p.gameIds,
        isSold: false
    })));
    res.json(created);
});

router.delete('/players/clear', async (req, res) => {
    try {
        await Player.destroy({ where: {} });
        res.json({ success: true, message: 'All players cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear players' });
    }
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
            // 1. Get Team and Config
            const [team, config] = await Promise.all([
                Team.findByPk(teamId, {
                    transaction: t,
                    include: [{ model: Player, as: 'players' }]
                }),
                Config.findOne({ transaction: t })
            ]);

            if (!team) throw new Error('Team not found');
            if (!config) throw new Error('System configuration not found');

            // 2. Check Squad Size and Reserved Funds
            if ((team as any).players && (team as any).players.length >= config.squadSize) {
                throw new Error(`Team ${team.name} already reached squad size limit of ${config.squadSize}`);
            }

            const remainingSlots = config.squadSize - ((team as any).players ? (team as any).players.length : 0);
            let reservedAmount = 0;
            if (remainingSlots > 1) {
                const otherUnsoldPlayers = await Player.findAll({
                    where: { isSold: false, id: { [Op.ne]: id } },
                    order: [['basePrice', 'ASC']],
                    limit: remainingSlots - 1,
                    transaction: t
                });
                reservedAmount = otherUnsoldPlayers.reduce((sum, p) => sum + p.basePrice, 0);

                if (otherUnsoldPlayers.length < remainingSlots - 1) {
                    reservedAmount += (remainingSlots - 1 - otherUnsoldPlayers.length) * 500000;
                }
            }

            if (team.purse - soldPrice < reservedAmount) {
                throw new Error(`Insufficient funds: Must reserve ${reservedAmount} to complete squad with ${remainingSlots - 1} more players`);
            }

            // 2b. Mandatory Quota Check
            const currentPlayers = (team as any).players || [];
            const currentPremiumCount = currentPlayers.filter((p: any) => p.category === 'Premium').length;
            const currentFemaleCount = currentPlayers.filter((p: any) => p.gender === 'Female').length;
            const premiumNeeded = Math.max(0, config.minPremium - currentPremiumCount);
            const femaleNeeded = Math.max(0, config.minFemale - currentFemaleCount);

            const playerBeingSold = await Player.findByPk(id, { transaction: t });
            if (!playerBeingSold) throw new Error('Player not found');

            // Block if this player is NOT Premium and we need all remaining slots for Premium
            if (playerBeingSold.category !== 'Premium' && premiumNeeded >= remainingSlots) {
                throw new Error(`Team must buy ${premiumNeeded} more Premium players with ${remainingSlots} slots remaining`);
            }

            // Block if this player is NOT Female and we need all remaining slots for Female
            if (playerBeingSold.gender !== 'Female' && femaleNeeded >= remainingSlots) {
                throw new Error(`Team must buy ${femaleNeeded} more Female players with ${remainingSlots} slots remaining`);
            }

            // Block if buying this player leaves insufficient slots for BOTH quotas
            const slotsAfterPurchase = remainingSlots - 1;
            const premiumStillNeeded = playerBeingSold.category === 'Premium' ? premiumNeeded - 1 : premiumNeeded;
            const femaleStillNeeded = playerBeingSold.gender === 'Female' ? femaleNeeded - 1 : femaleNeeded;

            if (premiumStillNeeded + femaleStillNeeded > slotsAfterPurchase) {
                throw new Error(`Insufficient slots: Need ${premiumStillNeeded} Premium + ${femaleStillNeeded} Female, but only ${slotsAfterPurchase} slots left`);
            }

            // 3. Update Team
            team.purse = team.purse - soldPrice;
            team.spent = team.spent + soldPrice;
            await team.save({ transaction: t });

            // 4. Update Player
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
    try {
        // Clear all data
        await Player.destroy({ where: {}, truncate: false });
        await Team.destroy({ where: {}, truncate: false });

        // Seed initial data if requested
        const { seed } = req.body;
        if (seed) {
            // Seed Teams
            const teamNames = ['Thunderbolts', 'Strikers', 'Dragons', 'Warriors', 'Titans', 'Kings'];
            const teams = await Team.bulkCreate(teamNames.map(name => ({
                name,
                purse: 10000000,
                spent: 0,
                matchesPlayed: 0,
                won: 0,
                lost: 0,
                tie: 0,
                points: 0,
                nrr: 0.0
            })));

            // Seed Players
            const positions = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];
            const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Rohan', 'Ishaan', 'Zara', 'Diya', 'Ananya', 'Priya', 'Kavya', 'Sanya', 'Myra'];
            const lastNames = ['Sharma', 'Verma', 'Singh', 'Patel', 'Reddy', 'Kumar', 'Das', 'Gupta', 'Rao', 'Nair'];

            const players = [];
            const allGames = await Game.findAll();
            for (let i = 0; i < 40; i++) {
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                const category = Math.random() > 0.8 ? 'Premium' : 'Standard';

                players.push({
                    name: `${firstName} ${lastName}`,
                    category: category,
                    gender: Math.random() > 0.2 ? 'Male' : 'Female',
                    position: positions[Math.floor(Math.random() * positions.length)],
                    employee_no: `EMP${1000 + i}`,
                    basePrice: category === 'Premium' ? 2000000 : 500000,
                    gameIds: allGames.length > 0 ? (
                        [...allGames].sort(() => 0.5 - Math.random())
                            .slice(0, Math.floor(Math.random() * 3) + 1)
                            .map(g => g.id)
                            .join(',')
                    ) : '',
                    isSold: false
                });
            }
            await Player.bulkCreate(players);
        }

        res.json({ success: true, message: seed ? 'Reset and seeded with sample data' : 'Reset successful' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
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
        const allGames = await Game.findAll();

        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const category = Math.random() > 0.8 ? 'Premium' : 'Standard';

            const gameIdsArr = [];
            if (allGames.length > 0) {
                const numGames = Math.floor(Math.random() * Math.min(allGames.length, 3)) + 1;
                const shuffled = [...allGames].sort(() => 0.5 - Math.random());
                for (let j = 0; j < numGames; j++) {
                    gameIdsArr.push(shuffled[j].id);
                }
            }

            players.push({
                name: `${firstName} ${lastName}`,
                category: category,
                gender: genders[Math.floor(Math.random() * genders.length)],
                position: positions[Math.floor(Math.random() * positions.length)],
                employee_no: `EMP${1000 + i}`,
                basePrice: category === 'Premium' ? 2000000 : 500000,
                gameIds: gameIdsArr.join(','),
                isSold: false
            });
        }

        await Player.bulkCreate(players);
        res.json({ success: true, count: players.length, message: `Seeded ${players.length} players` });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/seed/teams', async (req, res) => {
    try {
        const teamNames = ['Thunderbolts', 'Strikers', 'Dragons', 'Warriors'];
        const existingTeams = await Team.findAll();
        const existingNames = existingTeams.map(t => t.name);

        const teamsToCreate = teamNames
            .filter(name => !existingNames.includes(name))
            .map(name => ({
                name,
                purse: 10000000,
                spent: 0,
                matchesPlayed: 0,
                won: 0,
                lost: 0,
                tie: 0,
                points: 0,
                nrr: 0.0
            }));

        if (teamsToCreate.length === 0) {
            return res.json({ success: true, message: 'All sample teams already exist' });
        }

        const created = await Team.bulkCreate(teamsToCreate);
        res.json({ success: true, count: created.length, message: `Seeded ${created.length} teams` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/teams/clear', async (req, res) => {
    try {
        await Team.destroy({ where: {}, truncate: false });
        res.json({ success: true, message: 'All teams cleared' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/simulate/auction', async (req, res) => {
    try {
        const [unsoldPlayers, teams, config] = await Promise.all([
            Player.findAll({ where: { isSold: false } }),
            Team.findAll({ include: [{ model: Player, as: 'players' }] }),
            Config.findOne()
        ]);

        if (teams.length === 0) {
            return res.status(400).json({ error: 'No teams available for simulation' });
        }
        if (!config) {
            return res.status(400).json({ error: 'Configuration not found' });
        }

        // Make teams a mutable list we can track
        const teamInMem = teams.map(t => ({
            id: t.id,
            purse: t.purse,
            spent: t.spent,
            playerCount: (t as any).players ? (t as any).players.length : 0,
            premiumCount: (t as any).players ? (t as any).players.filter((p: any) => p.category === 'Premium').length : 0,
            femaleCount: (t as any).players ? (t as any).players.filter((p: any) => p.gender === 'Female').length : 0,
            model: t
        }));

        // Pre-sort all unsold base prices to make simulation faster
        const allUnsoldBasePrices = unsoldPlayers.map(p => p.basePrice).sort((a, b) => a - b);

        for (const player of unsoldPlayers) {
            // Pick a random team that can afford the base price AND has space AND has reserved funds AND meets quotas
            const availableTeams = teamInMem.filter(t => {
                const canAfford = t.purse >= player.basePrice;
                const hasSpace = t.playerCount < config.squadSize;
                const remainingSlots = config.squadSize - t.playerCount;

                let reservedAmount = 0;
                if (remainingSlots > 1) {
                    // In simulation, we roughly estimate by taking the cheapest available
                    // excluding theoretically the 'current' player (though simulation iterates all)
                    reservedAmount = allUnsoldBasePrices
                        .filter(bp => bp !== player.basePrice || allUnsoldBasePrices.indexOf(bp) !== allUnsoldBasePrices.lastIndexOf(bp))
                        .slice(0, remainingSlots - 1)
                        .reduce((sum, bp) => sum + bp, 0);

                    // Simple fallback if list is too small
                    if (allUnsoldBasePrices.length < remainingSlots) {
                        reservedAmount += (remainingSlots - allUnsoldBasePrices.length) * 500000;
                    }
                }

                const hasReserve = t.purse - player.basePrice >= reservedAmount;

                // Quota checks
                const premiumNeeded = Math.max(0, config.minPremium - t.premiumCount);
                const femaleNeeded = Math.max(0, config.minFemale - t.femaleCount);

                // Block if this player is NOT Premium and we need all remaining slots for Premium
                if (player.category !== 'Premium' && premiumNeeded >= remainingSlots) {
                    return false;
                }

                // Block if this player is NOT Female and we need all remaining slots for Female
                if (player.gender !== 'Female' && femaleNeeded >= remainingSlots) {
                    return false;
                }

                // Block if buying this player leaves insufficient slots for BOTH quotas
                const slotsAfterPurchase = remainingSlots - 1;
                const premiumStillNeeded = player.category === 'Premium' ? premiumNeeded - 1 : premiumNeeded;
                const femaleStillNeeded = player.gender === 'Female' ? femaleNeeded - 1 : femaleNeeded;

                if (premiumStillNeeded + femaleStillNeeded > slotsAfterPurchase) {
                    return false;
                }

                return canAfford && hasSpace && hasReserve;
            });

            if (availableTeams.length === 0) continue;

            const targetTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];

            // Randomly increase price (0 to 10 increments of 50000)
            const randomIncrements = Math.floor(Math.random() * 11);
            const finalPrice = player.basePrice + (randomIncrements * 50000);

            // Ensure team can still afford it
            if (targetTeam.purse < finalPrice) continue;

            await player.update({
                isSold: true,
                teamId: targetTeam.id,
                soldPrice: finalPrice
            });

            await targetTeam.model.update({
                spent: targetTeam.spent + finalPrice,
                purse: targetTeam.purse - finalPrice
            });

            // Update in-memory state for next player in loop
            targetTeam.purse -= finalPrice;
            targetTeam.spent += finalPrice;
            targetTeam.playerCount += 1;

            // Update quota counts
            if (player.category === 'Premium') {
                targetTeam.premiumCount += 1;
            }
            if (player.gender === 'Female') {
                targetTeam.femaleCount += 1;
            }
        }

        res.json({ success: true, message: `Simulated auction for ${unsoldPlayers.length} players` });
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

// --- Matches & Fixtures ---
router.get('/matches', async (req, res) => {
    try {
        const matches = await Match.findAll({
            include: [
                { model: Game, as: 'game' },
                { model: Team, as: 'teamA' },
                { model: Team, as: 'teamB' },
                { model: Player, as: 'playerA' },
                { model: Player, as: 'playerB' }
            ],
            order: [['createdAt', 'ASC']]
        });
        res.json(matches);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/tournaments/generate-round', async (req, res) => {
    const { gameId, playerIds, stageName } = req.body;
    try {
        let playersToPair = [];

        if (playerIds && playerIds.length > 0) {
            // Initial round or explicit players
            playersToPair = playerIds;
        } else {
            // Find winners of the previous round
            // We need to know what the previous round was. 
            // For simplicity, let's assume the frontend sends the players or we find the latest completed round.
            const latestMatches = await Match.findAll({
                where: { gameId, status: 'completed' },
                order: [['createdAt', 'DESC']]
            });

            if (latestMatches.length === 0) {
                return res.status(400).json({ error: 'No previous round found or no players provided' });
            }

            const lastStage = latestMatches[0].stage;
            const winners = latestMatches
                .filter(m => m.stage === lastStage && m.winnerId && m.winnerId !== 'draw')
                .map(m => m.winnerId!);

            playersToPair = winners;
        }

        if (playersToPair.length < 2) {
            return res.status(400).json({ error: 'Not enough players to generate a round' });
        }

        // Shuffle players
        const shuffled = [...playersToPair].sort(() => 0.5 - Math.random());
        const fixtures = [];

        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                fixtures.push({
                    gameId,
                    playerAId: shuffled[i],
                    playerBId: shuffled[i + 1],
                    status: 'scheduled' as any,
                    stage: stageName || 'Elimination Round'
                });
            } else {
                // Odd number of players, one gets a bye
                // Create a match where playerB is null and mark as completed with winner A
                const byeMatch = await Match.create({
                    gameId,
                    playerAId: shuffled[i],
                    winnerId: shuffled[i],
                    status: 'completed',
                    stage: stageName || 'Elimination Round',
                    scoreA: 1,
                    scoreB: 0
                });
            }
        }

        if (fixtures.length > 0) {
            await Match.bulkCreate(fixtures);
        }

        res.json({ success: true, message: `Generated ${fixtures.length} matches and handled byes.` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/fixtures/generate', async (req, res) => {
    try {
        const teams = await Team.findAll();
        const games = await Game.findAll();

        if (teams.length < 2) {
            return res.status(400).json({ error: 'At least 2 teams required to generate fixtures' });
        }

        const fixtures = [];
        for (const game of games) {
            // Simple Round Robin for each game
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    fixtures.push({
                        gameId: game.id,
                        teamAId: teams[i].id,
                        teamBId: teams[j].id,
                        status: 'scheduled' as 'scheduled' | 'completed',
                        stage: 'league' as 'league' | 'semi-final' | 'final'
                    });
                }
            }
        }

        if (fixtures.length === 0) {
            return res.json({ success: true, message: 'No fixtures to generate' });
        }

        const created = await Match.bulkCreate(fixtures);
        res.json({ success: true, count: created.length, message: `Generated ${created.length} fixtures` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/matches/simulate', async (req, res) => {
    try {
        const matches = await Match.findAll({
            where: { status: 'scheduled' },
            include: [{ model: Game, as: 'game' }]
        });

        let count = 0;
        for (const match of matches) {
            const game = (match as any).game;
            let scoreA = Math.floor(Math.random() * 5);
            let scoreB = Math.floor(Math.random() * 5);

            // In knockout stages, ensure we have a winner (no draws)
            if (match.stage !== 'league' && scoreA === scoreB) {
                if (Math.random() > 0.5) scoreA++;
                else scoreB++;
            }

            let winnerId: string | 'draw' = 'draw';
            if (scoreA > scoreB) winnerId = (match.teamAId || match.playerAId)!;
            else if (scoreB > scoreA) winnerId = (match.teamBId || match.playerBId)!;

            await match.update({
                scoreA,
                scoreB,
                winnerId,
                status: 'completed'
            });

            // Update Team Stats
            const teamA = await Team.findByPk(match.teamAId);
            const teamB = await Team.findByPk(match.teamBId);

            if (teamA && teamB) {
                const ptsWin = game.pointsFirst || 2;
                const ptsDraw = 1;

                const isDraw = winnerId === 'draw';

                await teamA.update({
                    matchesPlayed: teamA.matchesPlayed + 1,
                    won: teamA.won + (!isDraw && winnerId === teamA.id ? 1 : 0),
                    lost: teamA.lost + (!isDraw && winnerId !== teamA.id ? 1 : 0),
                    tie: teamA.tie + (isDraw ? 1 : 0),
                    points: teamA.points + (isDraw ? ptsDraw : (winnerId === teamA.id ? ptsWin : 0))
                });

                await teamB.update({
                    matchesPlayed: teamB.matchesPlayed + 1,
                    won: teamB.won + (!isDraw && winnerId === teamB.id ? 1 : 0),
                    lost: teamB.lost + (!isDraw && winnerId !== teamB.id ? 1 : 0),
                    tie: teamB.tie + (isDraw ? 1 : 0),
                    points: teamB.points + (isDraw ? ptsDraw : (winnerId === teamB.id ? ptsWin : 0))
                });

                // Update Player Stats for Team
                const playersA = await Player.findAll({ where: { teamId: match.teamAId } });
                const playersB = await Player.findAll({ where: { teamId: match.teamBId } });

                for (const p of playersA) {
                    await p.update({
                        matchesPlayed: p.matchesPlayed + 1,
                        points: p.points + (isDraw ? ptsDraw : (winnerId === teamA.id ? ptsWin : 0))
                    });
                }
                for (const p of playersB) {
                    await p.update({
                        matchesPlayed: p.matchesPlayed + 1,
                        points: p.points + (isDraw ? ptsDraw : (winnerId === teamB.id ? ptsWin : 0))
                    });
                }
            } else if (match.playerAId) {
                // Individual Player Match
                const playerA = await Player.findByPk(match.playerAId);
                const playerB = match.playerBId ? await Player.findByPk(match.playerBId) : null;

                const ptsWin = game.pointsFirst || 2;
                const isDraw = winnerId === 'draw';

                if (playerA) {
                    await playerA.update({
                        matchesPlayed: playerA.matchesPlayed + 1,
                        points: playerA.points + (isDraw ? 1 : (winnerId === playerA.id ? ptsWin : 0))
                    });
                }
                if (playerB) {
                    await playerB.update({
                        matchesPlayed: playerB.matchesPlayed + 1,
                        points: playerB.points + (isDraw ? 1 : (winnerId === playerB.id ? ptsWin : 0))
                    });
                }
            }

            count++;
        }

        res.json({ success: true, message: `Simulated ${count} matches` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/matches/:id/record', async (req, res) => {
    const { id } = req.params;
    const { winnerId, scoreA, scoreB } = req.body;

    try {
        const match = await Match.findByPk(id, {
            include: [{ model: Game, as: 'game' }]
        });

        if (!match) return res.status(404).json({ error: 'Match not found' });
        if (match.status === 'completed') return res.status(400).json({ error: 'Match already completed' });

        const game = (match as any).game;
        await match.update({
            winnerId,
            scoreA: scoreA || 0,
            scoreB: scoreB || 0,
            status: 'completed'
        });

        // Update Stats
        const teamA = match.teamAId ? await Team.findByPk(match.teamAId) : null;
        const teamB = match.teamBId ? await Team.findByPk(match.teamBId) : null;

        if (teamA && teamB) {
            const ptsWin = game.pointsFirst || 2;
            const ptsDraw = 1;
            const isDraw = winnerId === 'draw';

            await teamA.update({
                matchesPlayed: teamA.matchesPlayed + 1,
                won: teamA.won + (!isDraw && winnerId === teamA.id ? 1 : 0),
                lost: teamA.lost + (!isDraw && winnerId !== teamA.id ? 1 : 0),
                tie: teamA.tie + (isDraw ? 1 : 0),
                points: teamA.points + (isDraw ? ptsDraw : (winnerId === teamA.id ? ptsWin : 0))
            });

            await teamB.update({
                matchesPlayed: teamB.matchesPlayed + 1,
                won: teamB.won + (!isDraw && winnerId === teamB.id ? 1 : 0),
                lost: teamB.lost + (!isDraw && winnerId !== teamB.id ? 1 : 0),
                tie: teamB.tie + (isDraw ? 1 : 0),
                points: teamB.points + (isDraw ? ptsDraw : (winnerId === teamB.id ? ptsWin : 0))
            });

            // Update Player Stats for Team
            const playersA = await Player.findAll({ where: { teamId: match.teamAId } });
            const playersB = await Player.findAll({ where: { teamId: match.teamBId } });

            for (const p of playersA) {
                await p.update({
                    matchesPlayed: p.matchesPlayed + 1,
                    points: p.points + (isDraw ? ptsDraw : (winnerId === teamA.id ? ptsWin : 0))
                });
            }
            for (const p of playersB) {
                await p.update({
                    matchesPlayed: p.matchesPlayed + 1,
                    points: p.points + (isDraw ? ptsDraw : (winnerId === teamB.id ? ptsWin : 0))
                });
            }
        } else if (match.playerAId) {
            // Individual Player Match
            const playerA = await Player.findByPk(match.playerAId);
            const playerB = match.playerBId ? await Player.findByPk(match.playerBId) : null;

            const ptsWin = game.pointsFirst || 2;
            const isDraw = winnerId === 'draw';

            if (playerA) {
                await playerA.update({
                    matchesPlayed: playerA.matchesPlayed + 1,
                    points: playerA.points + (isDraw ? 1 : (winnerId === playerA.id ? ptsWin : 0))
                });
            }
            if (playerB) {
                await playerB.update({
                    matchesPlayed: playerB.matchesPlayed + 1,
                    points: playerB.points + (isDraw ? 1 : (winnerId === playerB.id ? ptsWin : 0))
                });
            }
        }

        res.json({ success: true, message: 'Match result recorded' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/knockouts/semi-finals/generate', async (req, res) => {
    try {
        const games = await Game.findAll();
        const teams = await Team.findAll({
            order: [['points', 'DESC'], ['won', 'DESC']]
        });

        if (teams.length < 4) {
            return res.status(400).json({ error: 'At least 4 teams required for Semi-finals' });
        }

        const top4 = teams.slice(0, 4);
        const fixtures = [];

        for (const game of games) {
            // Check if semi-finals already exist for this game
            const existing = await Match.findOne({ where: { gameId: game.id, stage: 'semi-final' } });
            if (existing) continue;

            // 1st vs 4th
            fixtures.push({
                gameId: game.id,
                teamAId: top4[0].id,
                teamBId: top4[3].id,
                status: 'scheduled' as any,
                stage: 'semi-final' as any
            });

            // 2nd vs 3rd
            fixtures.push({
                gameId: game.id,
                teamAId: top4[1].id,
                teamBId: top4[2].id,
                status: 'scheduled' as any,
                stage: 'semi-final' as any
            });
        }

        if (fixtures.length === 0) {
            return res.status(400).json({ error: 'Semi-finals already generated or no games available' });
        }

        await Match.bulkCreate(fixtures);
        res.json({ success: true, message: `Generated ${fixtures.length} semi-final matches` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/knockouts/finals/generate', async (req, res) => {
    try {
        const games = await Game.findAll();
        const fixtures = [];

        for (const game of games) {
            // Check if finals already exist
            const existingFinal = await Match.findOne({ where: { gameId: game.id, stage: 'final' } });
            if (existingFinal) continue;

            // Get winners of semi-finals
            const semiFinals = await Match.findAll({
                where: { gameId: game.id, stage: 'semi-final', status: 'completed' }
            });

            if (semiFinals.length < 2) continue;

            fixtures.push({
                gameId: game.id,
                teamAId: semiFinals[0].winnerId!,
                teamBId: semiFinals[1].winnerId!,
                status: 'scheduled' as any,
                stage: 'final' as any
            });
        }

        if (fixtures.length === 0) {
            return res.status(400).json({ error: 'Semi-finals not complete or finals already generated' });
        }

        await Match.bulkCreate(fixtures);
        res.json({ success: true, message: `Generated ${fixtures.length} final matches` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/matches/clear', async (req, res) => {
    try {
        await Match.destroy({ where: {} });
        await Team.update({
            matchesPlayed: 0,
            won: 0,
            lost: 0,
            tie: 0,
            points: 0
        }, { where: {} });
        res.json({ success: true, message: 'Matches cleared and standings reset' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
