import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { WorkstationManagement } from './WorkstationManagement';
import { DivisionManagement } from './DivisionManagement';
import { Database } from 'lucide-react';
import { dataService } from '../lib/dataService';

interface WorkstationDataTabsProps {
  onDataChange?: () => void;
}

export function WorkstationDataTabs({ onDataChange }: WorkstationDataTabsProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await dataService.getDashboardStats('Admin');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = () => {
    loadData();
    onDataChange?.();
  };

  return (
    <div className="space-y-6">
      <WorkstationManagement onDataChange={handleDataChange} />
      <DivisionManagement onDataChange={handleDataChange} />
    </div>
  );
}