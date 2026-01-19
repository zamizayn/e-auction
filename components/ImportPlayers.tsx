
import React from 'react';
import { Player, PlayerCategory, Gender } from '../types';

interface ImportPlayersProps {
  onImport: (players: Player[]) => void;
}

const ImportPlayers: React.FC<ImportPlayersProps> = ({ onImport }) => {
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

      const importedPlayers: Player[] = data.map((item: any, index: number) => ({
        id: `imp-${Date.now()}-${index}`,
        name: item.Name || 'Unknown Player',
        category: item.Category === 'Premium' ? PlayerCategory.PREMIUM : PlayerCategory.STANDARD,
        gender: item.Gender === 'Female' ? Gender.FEMALE : Gender.MALE,
        position: item.Position,
        employee_no: item.EmployeeNo,
        basePrice: parseInt(item.BasePrice) || 500000,
        isSold: false
      }));

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
        Expected columns: Name, Category (Premium/Standard), Gender (Male/Female), Position, EmployeeNo, BasePrice
      </div>
    </div>
  );
};

export default ImportPlayers;
