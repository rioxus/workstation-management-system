import { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

interface PasswordCellProps {
  employee: {
    id: string;
    password?: string;
  };
  onPasswordUpdate?: () => void;
}

export function PasswordCell({ employee }: PasswordCellProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPassword = async () => {
    if (!employee.password) return;
    
    // Use fallback method directly to avoid clipboard permission errors
    copyToClipboardFallback(employee.password);
  };

  const copyToClipboardFallback = (text: string) => {
    try {
      // Create temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make it invisible and non-interactive
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // Try to copy
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        toast.success('Password copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Failed to copy password. Please copy manually.');
      }
    } catch (err) {
      console.error('Fallback copy error:', err);
      toast.error('Failed to copy password. Please copy manually.');
    }
  };

  if (!employee.password) {
    return (
      <span className="text-sm text-slate-400">Not set</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono min-w-[100px]">
        {showPassword ? employee.password : '••••••••'}
      </code>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowPassword(!showPassword)}
        className="h-7 w-7 p-0"
      >
        {showPassword ? (
          <EyeOff className="h-3 w-3 text-slate-600" />
        ) : (
          <Eye className="h-3 w-3 text-slate-600" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopyPassword}
        className="h-7 w-7 p-0"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-slate-600" />
        )}
      </Button>
    </div>
  );
}