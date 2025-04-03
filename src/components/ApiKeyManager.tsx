
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Key, KeyRound, X, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { getOpenAIKey, setOpenAIKey, clearOpenAIKey, hasOpenAIKey } from '@/utils/openaiClient';

interface ApiKeyManagerProps {
  onKeyChange?: (hasKey: boolean) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onKeyChange }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [hasKey, setHasKey] = useState<boolean>(hasOpenAIKey());

  useEffect(() => {
    // Initialize with stored key if available
    const storedKey = getOpenAIKey();
    setHasKey(!!storedKey);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    // Test if the key follows a basic pattern for OpenAI keys
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      toast.error('The API key format appears to be invalid');
      return;
    }

    setOpenAIKey(apiKey);
    setHasKey(true);
    setIsDialogOpen(false);
    toast.success('OpenAI API key saved successfully');
    
    if (onKeyChange) {
      onKeyChange(true);
    }
  };

  const handleClearKey = () => {
    clearOpenAIKey();
    setApiKey('');
    setHasKey(false);
    setIsDialogOpen(false);
    toast.info('OpenAI API key has been removed');
    
    if (onKeyChange) {
      onKeyChange(false);
    }
  };

  const toggleKeyVisibility = () => {
    setShowKey(!showKey);
  };

  return (
    <>
      <Button
        variant={hasKey ? "default" : "outline"}
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className={`flex items-center space-x-2 ${hasKey ? "bg-green-600 hover:bg-green-700" : ""}`}
      >
        {hasKey ? (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>API Key Set</span>
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4" />
            <span>Set OpenAI API Key</span>
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>OpenAI API Key</DialogTitle>
            <DialogDescription>
              Enter your OpenAI API key to enable AI-powered document summarization.
              Your key will be stored locally in your browser and is never sent to our servers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-gray-500" />
              <div className="text-sm font-medium">API Key</div>
            </div>
            
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={toggleKeyVisibility}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500">
              <AlertCircle className="h-3 w-3 inline-block mr-1" />
              Your API key is stored only in your browser's local storage.
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2">
              {hasKey && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleClearKey}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove Key
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
            </div>
            <Button type="button" onClick={handleSaveKey} className="flex items-center">
              <Save className="h-4 w-4 mr-2" />
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiKeyManager;
