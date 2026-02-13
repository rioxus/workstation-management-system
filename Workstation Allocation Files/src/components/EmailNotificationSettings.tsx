/**
 * Email Notification Settings Component
 * Allows admins to configure their email notification preferences
 * 
 * FUTURE ENHANCEMENT: This component can be integrated into the admin settings page
 * to allow admins to control which types of notifications they receive via email
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Bell, Mail, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmailNotificationSettingsProps {
  currentUserEmail: string;
  onSave?: (settings: EmailPreferences) => void;
}

interface EmailPreferences {
  enableNewRequests: boolean;
  enableApprovals: boolean;
  enableRejections: boolean;
  enableReminders: boolean;
  digestMode: 'instant' | 'daily' | 'weekly';
  quietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export function EmailNotificationSettings({ currentUserEmail, onSave }: EmailNotificationSettingsProps) {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    enableNewRequests: true,
    enableApprovals: true,
    enableRejections: false,
    enableReminders: true,
    digestMode: 'instant',
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const [testEmailSent, setTestEmailSent] = useState(false);

  const handleChange = (key: keyof EmailPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(preferences);
    }
    toast.success('Email notification preferences saved');
  };

  const handleSendTestEmail = async () => {
    try {
      // Simulate sending test email
      // In production, this would call the email service
      setTestEmailSent(true);
      toast.success(`Test email sent to ${currentUserEmail}`);
      
      setTimeout(() => setTestEmailSent(false), 3000);
    } catch (error) {
      toast.error('Failed to send test email');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Email Notification Settings</h2>
        <p className="text-slate-600">
          Configure how and when you receive email notifications about workstation requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Preferences
          </CardTitle>
          <CardDescription>
            Current email address: <strong>{currentUserEmail}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="font-semibold">Notification Types</h3>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="new-requests">New Requests</Label>
                <p className="text-sm text-slate-500">
                  Get notified when users submit new workstation requests
                </p>
              </div>
              <Switch
                id="new-requests"
                checked={preferences.enableNewRequests}
                onCheckedChange={(checked) => handleChange('enableNewRequests', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="approvals">Request Approvals</Label>
                <p className="text-sm text-slate-500">
                  Get notified when requests are approved by other admins
                </p>
              </div>
              <Switch
                id="approvals"
                checked={preferences.enableApprovals}
                onCheckedChange={(checked) => handleChange('enableApprovals', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="rejections">Request Rejections</Label>
                <p className="text-sm text-slate-500">
                  Get notified when requests are rejected
                </p>
              </div>
              <Switch
                id="rejections"
                checked={preferences.enableRejections}
                onCheckedChange={(checked) => handleChange('enableRejections', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="reminders">Pending Request Reminders</Label>
                <p className="text-sm text-slate-500">
                  Daily reminders for pending requests awaiting your review
                </p>
              </div>
              <Switch
                id="reminders"
                checked={preferences.enableReminders}
                onCheckedChange={(checked) => handleChange('enableReminders', checked)}
              />
            </div>
          </div>

          {/* Delivery Mode */}
          <div className="space-y-4">
            <h3 className="font-semibold">Delivery Mode</h3>
            
            <div className="space-y-2">
              <Label htmlFor="digest-mode">Email Frequency</Label>
              <Select
                value={preferences.digestMode}
                onValueChange={(value: any) => handleChange('digestMode', value)}
              >
                <SelectTrigger id="digest-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <div>
                        <div>Instant Notifications</div>
                        <div className="text-xs text-slate-500">
                          Receive emails immediately when events occur
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <div>
                        <div>Daily Digest</div>
                        <div className="text-xs text-slate-500">
                          One email per day with all notifications
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <div>
                        <div>Weekly Digest</div>
                        <div className="text-xs text-slate-500">
                          One email per week with summary
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-4">
            <h3 className="font-semibold">Quiet Hours</h3>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                <p className="text-sm text-slate-500">
                  Don't send notifications during specified hours
                </p>
              </div>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHours}
                onCheckedChange={(checked) => handleChange('quietHours', checked)}
              />
            </div>

            {preferences.quietHours && (
              <div className="grid grid-cols-2 gap-4 ml-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <input
                    id="quiet-start"
                    type="time"
                    className="w-full px-3 py-2 border rounded-md"
                    value={preferences.quietHoursStart}
                    onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <input
                    id="quiet-end"
                    type="time"
                    className="w-full px-3 py-2 border rounded-md"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Email */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={testEmailSent}
              className="w-full"
            >
              {testEmailSent ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Test Email Sent!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Send a test notification to verify your email settings
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-blue-900">Email Notification Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Instant mode is best for high-priority notifications</li>
                <li>• Daily digest reduces email volume while staying informed</li>
                <li>• Use quiet hours to prevent notifications during off-hours</li>
                <li>• You can always view all notifications in the application dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
