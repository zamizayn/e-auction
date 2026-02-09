import React, { useState } from 'react';
import { TournamentView } from '../components/TournamentView';
import { useAppContext } from '../context/AppContext';

export const Tournament: React.FC = () => {
    const { games, availablePlayers, matches, fetchData, setMessage } = useAppContext();
    const [selectedTournamentGameId, setSelectedTournamentGameId] = useState<string>('');

    return (
        <div className="h-full overflow-hidden p-8">
            <TournamentView
                games={games}
                availablePlayers={availablePlayers}
                matches={matches}
                selectedGameId={selectedTournamentGameId}
                onGameSelect={setSelectedTournamentGameId}
                onFetchData={fetchData}
                onMessage={setMessage}
            />
        </div>
    );
};
