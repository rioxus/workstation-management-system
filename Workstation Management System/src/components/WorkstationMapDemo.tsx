import { WorkstationMap } from './WorkstationMap';

// Generate sample workstation data for demonstration
const generateSampleWorkstations = () => {
  const departments = ['Admin', 'HR', 'Tech', 'Engineering', 'BPM', 'Sales', 'Marketing', 'Finance'];
  const floors = ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5', 'Floor 6'];
  const labs = ['Lab A', 'Lab B', 'Lab C', 'Lab D'];
  const shifts = ['Morning', 'Afternoon', 'Night'];
  const statuses: ('active' | 'available' | 'maintenance' | 'reserved')[] = ['active', 'available', 'maintenance', 'reserved'];
  const names = [
    'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'David Brown',
    'Emily Davis', 'Robert Miller', 'Lisa Wilson', 'James Moore', 'Maria Garcia'
  ];

  const workstations = [];
  let idCounter = 1;

  // Generate workstations for each floor
  floors.forEach(floor => {
    // Randomly select 3-5 departments for this floor
    const numDepts = Math.floor(Math.random() * 3) + 3;
    const selectedDepts = [...departments]
      .sort(() => Math.random() - 0.5)
      .slice(0, numDepts);

    selectedDepts.forEach(dept => {
      // Each department gets 8-20 workstations
      const numWorkstations = Math.floor(Math.random() * 13) + 8;
      const lab = labs[Math.floor(Math.random() * labs.length)];

      for (let i = 1; i <= numWorkstations; i++) {
        const wsNumber = String(i).padStart(3, '0');
        const floorCode = floor.replace('Floor ', 'F-');
        const assetId = `${dept}/WS/${floorCode}/${wsNumber}`;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const isAssigned = status === 'active';

        workstations.push({
          id: `ws-${idCounter++}`,
          assetId,
          department: dept,
          floor,
          lab,
          number: wsNumber,
          status,
          assignedTo: isAssigned ? names[Math.floor(Math.random() * names.length)] : undefined,
          shift: isAssigned ? shifts[Math.floor(Math.random() * shifts.length)] : undefined,
          hasPC: Math.random() > 0.3,
          hasMonitor: Math.random() > 0.2,
        });
      }
    });
  });

  return workstations;
};

export function WorkstationMapDemo() {
  const sampleWorkstations = generateSampleWorkstations();

  return <WorkstationMap workstations={sampleWorkstations} />;
}
