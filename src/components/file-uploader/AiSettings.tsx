
import React from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApiKeyManager from '../ApiKeyManager';

interface AiSettingsProps {
  aiEnabled: boolean;
  onToggleAi: () => void;
  onApiKeyChange: (hasKey: boolean) => void;
}

const AiSettings: React.FC<AiSettingsProps> = ({ 
  aiEnabled, 
  onToggleAi, 
  onApiKeyChange 
}) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">AI Summarization</span>
      <Button 
        variant={aiEnabled ? "default" : "outline"} 
        size="sm"
        onClick={onToggleAi}
        className={aiEnabled ? "bg-blue-600" : ""}
      >
        <Zap className={`h-4 w-4 mr-1 ${aiEnabled ? "text-white" : "text-gray-500"}`} />
        {aiEnabled ? "Enabled" : "Disabled"}
      </Button>
      <ApiKeyManager onKeyChange={onApiKeyChange} />
    </div>
  );
};

export default AiSettings;
