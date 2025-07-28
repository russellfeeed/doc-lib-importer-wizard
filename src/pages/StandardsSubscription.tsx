import React from 'react';
import StandardsDocumentImporter from '@/components/StandardsDocumentImporter';

const StandardsSubscription: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Standards on Subscription</h1>
      <p className="text-gray-600 mb-8">
        Upload and manage standards documents. Documents will be automatically categorized as either "Standards {`>`} System" or "Standards {`>`} Service".
      </p>
      <StandardsDocumentImporter />
    </div>
  );
};

export default StandardsSubscription;