
import React from 'react';
import { Player, PlayerCategory, Gender } from '../types';
import { useAppContext } from '../context/AppContext';

interface ImportPlayersProps {
  onImport: (players: Player[]) => void;
}

const ImportPlayers: React.FC<ImportPlayersProps> = ({ onImport }) => {
  const { games, config } = useAppContext();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const workbook = (window as any).XLSX.read(bstr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = (window as any).XLSX.utils.sheet_to_json(worksheet);

      const sportColumns = ['Football', 'Cricket', 'French Cricket', 'Badminton', 'Carroms', 'Chess', 'Snake & ladder', 'Ludo', 'Jenga', 'Dart', 'PES Online', 'Fun Reel'];

      const importedPlayers: Player[] = data.map((item: any, index: number) => {
        // Normalize keys to lowercase for easier matching
        const normalizedItem: any = {};
        Object.keys(item).forEach(key => {
          normalizedItem[key.trim().toLowerCase()] = item[key];
        });

        // Map sports columns to game IDs
        const playerGameIds: string[] = [];

        sportColumns.forEach(sport => {
          const sportKey = sport.toLowerCase();
          // Check for both spellings (Carroms/Caroms) in the sheet
          let val = normalizedItem[sportKey];
          if (sportKey === 'carroms' && !val) {
            val = normalizedItem['caroms'];
          }

          if (val && String(val).trim().toLowerCase() === 'yes') {
            // Find games matching this sport (also handle Carroms/Caroms spelling mismatch)
            const matchingGames = games.filter(g => {
              if (!g.sport) return false;
              const gSport = g.sport.toLowerCase();
              if (sportKey === 'carroms') {
                return gSport === 'carroms' || gSport === 'caroms';
              }
              return gSport === sportKey;
            });
            matchingGames.forEach(g => playerGameIds.push(g.id));
          }
        });

        // Helper to find value by possible keys
        const getValue = (keys: string[]) => {
          for (const key of keys) {
            if (normalizedItem[key.toLowerCase()]) return normalizedItem[key.toLowerCase()];
          }
          return null;
        };

        const name = getValue(['Name', 'Player Name', 'Full Name']) || 'Unknown Player';
        const empNo = getValue(['ID', 'EmployeeNo', 'Emp No', 'Employee ID']);
        const categoryVal = getValue(['Category', 'Player Category']);
        const genderVal = getValue(['Gender', 'Sex']);
        const position = getValue(['Position', 'Role']);
        const rawPriceValue = getValue(['BasePrice', 'Base Price', 'Price']);
        const price = parseInt(rawPriceValue);
        const category = categoryVal === 'Premium' ? PlayerCategory.PREMIUM : PlayerCategory.STANDARD;
        const finalBasePrice = price || (category === PlayerCategory.PREMIUM ? config.premiumBasePrice : config.defaultBasePrice) || 500000;

        return {
          id: `imp-${Date.now()}-${index}`,
          name: name,
          category: category,
          gender: genderVal === 'Female' ? Gender.FEMALE : Gender.MALE,
          position: position,
          employee_no: empNo,
          basePrice: finalBasePrice,
          isSold: false,
          gameIds: playerGameIds.join(',')
        };
      });

      onImport(importedPlayers);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex items-center gap-4">
      <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-all flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        Import Players
        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
      </label>
      <div className="text-xs text-slate-500">
        Expected columns: Name, ID, Category, Gender + Sports columns
      </div>
    </div>
  );
};

export default ImportPlayers;
