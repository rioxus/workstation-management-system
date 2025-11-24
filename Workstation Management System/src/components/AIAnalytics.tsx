import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

export function AIAnalytics() {
  const predictions = [
    {
      title: 'Workstation Demand Forecast',
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      insights: [
        'Expected 18% increase in workstation demand for Q2 2025',
        'Peak demand predicted for CH Office 5th Floor (15 additional seats)',
        'Gurukul Office showing steady growth trend',
      ],
    },
    {
      title: 'Underutilization Alerts',
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      insights: [
        '12 workstations vacant for more than 30 days',
        'Chennai Office has 22% unutilized capacity',
        '8 workstations allocated but employee on WFH (>60 days)',
      ],
    },
    {
      title: 'Optimization Recommendations',
      icon: Lightbulb,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      insights: [
        'Reallocate 5 workstations from Chennai to CH Office 9th Floor',
        'Consider hot-desking for hybrid teams to improve utilization',
        'Equipment audit needed: 7 monitors, 4 PCs required',
      ],
    },
  ];

  const utilizationByLocation = [
    { location: 'CH Office - 9th Floor', utilization: 92, trend: 'up' },
    { location: 'CH Office - 5th Floor', utilization: 88, trend: 'up' },
    { location: 'CH Office - 4th Floor', utilization: 75, trend: 'stable' },
    { location: 'Gurukul Office', utilization: 82, trend: 'up' },
    { location: 'Cochin Office', utilization: 68, trend: 'down' },
    { location: 'Chennai Office', utilization: 58, trend: 'down' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">AI-Powered Analytics</h1>
        <p className="text-slate-600">
          Predictive insights and optimization recommendations for workstation management
        </p>
      </div>

      {/* AI Insights Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {predictions.map((prediction, index) => (
          <Card key={index} className={`border-l-4 ${prediction.bgColor}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <prediction.icon className={`w-5 h-5 ${prediction.color}`} />
                {prediction.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {prediction.insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Utilization by Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Utilization Rate by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {utilizationByLocation.map((location, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{location.location}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        location.trend === 'up'
                          ? 'text-green-600 border-green-600'
                          : location.trend === 'down'
                          ? 'text-red-600 border-red-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {location.trend === 'up' ? '↑' : location.trend === 'down' ? '↓' : '→'}
                    </Badge>
                  </div>
                  <span className="text-sm">{location.utilization}%</span>
                </div>
                <Progress
                  value={location.utilization}
                  className={`h-2 ${
                    location.utilization >= 80
                      ? '[&>div]:bg-green-500'
                      : location.utilization >= 60
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-red-500'
                  }`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shift Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Morning Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl mb-2">380</p>
            <p className="text-sm text-slate-600 mb-4">Employees</p>
            <Progress value={85} className="h-2 mb-2" />
            <p className="text-xs text-slate-500">85% utilization rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Afternoon Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl mb-2">150</p>
            <p className="text-sm text-slate-600 mb-4">Employees</p>
            <Progress value={72} className="h-2 mb-2" />
            <p className="text-xs text-slate-500">72% utilization rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Night Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl mb-2">70</p>
            <p className="text-sm text-slate-600 mb-4">Employees</p>
            <Progress value={58} className="h-2 mb-2" />
            <p className="text-xs text-slate-500">58% utilization rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Status */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Equipment Shortages Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl text-red-700">7</p>
              <p className="text-sm text-slate-700">Monitors Needed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-red-700">4</p>
              <p className="text-sm text-slate-700">PCs Required</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-red-700">12</p>
              <p className="text-sm text-slate-700">Keyboards Missing</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-red-700">8</p>
              <p className="text-sm text-slate-700">Mice Required</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
