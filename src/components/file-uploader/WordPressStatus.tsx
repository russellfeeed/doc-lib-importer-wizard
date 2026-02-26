import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { getWordPressCredentials } from '@/utils/wordpressUtils';

const WordPressStatus: React.FC = () => {
  const credentials = getWordPressCredentials();

  if (credentials) {
    return (
      <div className="flex items-center gap-2 text-sm rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>WordPress connected: <strong>{credentials.url}</strong></span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        WordPress not configured — duplicate check will be skipped.{' '}
        <Link to="/settings" className="underline font-medium hover:text-amber-900">
          Configure in Settings
        </Link>
      </span>
    </div>
  );
};

export default WordPressStatus;
