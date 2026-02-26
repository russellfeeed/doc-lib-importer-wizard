import React from 'react';
import StandardsDocumentImporter from '@/components/StandardsDocumentImporter';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { clearDlpDocumentsCache } from '@/utils/wordpressUtils';
import { toast } from 'sonner';

const StandardsSubscription: React.FC = () => {
  const handleClearCache = () => {
    clearDlpDocumentsCache();
    toast.success('WordPress document cache cleared. Next duplicate check will fetch fresh data.');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Standards on Subscription</h1>
        <Button variant="outline" size="sm" onClick={handleClearCache}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Clear WP Cache
        </Button>
      </div>
      <p className="text-muted-foreground mb-8">
        Upload and manage standards documents. Documents will be automatically categorized as either "Standards {`>`} System" or "Standards {`>`} Service".
      </p>
      <StandardsDocumentImporter />
    </div>
  );
};

export default StandardsSubscription;