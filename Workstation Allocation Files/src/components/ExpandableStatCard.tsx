import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LocationBreakdown {
  location: string;
  value: number;
}

interface ExpandableStatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  locationBreakdown: LocationBreakdown[];
}

export function ExpandableStatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  locationBreakdown,
}: ExpandableStatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div
          className="flex items-start justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-slate-600">{title}</p>
              {locationBreakdown.length > 0 && (
                <button 
                  onClick={toggleExpanded}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              )}
            </div>
            <p className="text-3xl">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>

        {/* Expandable Location Breakdown */}
        {isExpanded && locationBreakdown.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-slate-500 mb-2">Location-wise breakdown:</p>
            {locationBreakdown.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm text-slate-700">{item.location}</span>
                <span className={`text-sm font-medium ${color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}