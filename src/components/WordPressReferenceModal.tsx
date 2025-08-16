import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Tag, AlertCircle } from 'lucide-react';
import { fetchWordPressTaxonomies } from '@/utils/wordpressUtils';

interface WordPressReferenceModalProps {
  children: React.ReactNode;
}

const WordPressReferenceModal: React.FC<WordPressReferenceModalProps> = ({ children }) => {
  const [docCategories, setDocCategories] = useState<any[]>([]);
  const [nsiSchemes, setNsiSchemes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadWordPressData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get WordPress credentials from localStorage
      const wpSiteUrl = localStorage.getItem('wp_site_url');
      const wpUsername = localStorage.getItem('wp_username');
      const wpPassword = localStorage.getItem('wp_password');

      if (!wpSiteUrl || !wpUsername || !wpPassword) {
        throw new Error('WordPress credentials not found. Please configure them in Settings.');
      }

      const credentials = {
        url: wpSiteUrl,
        username: wpUsername,
        password: wpPassword
      };

      // Fetch both taxonomies in parallel
      const [categories, schemes] = await Promise.all([
        fetchWordPressTaxonomies('doc_categories', credentials).catch(() => []),
        fetchWordPressTaxonomies('nsi_scheme', credentials).catch(() => [])
      ]);

      setDocCategories(categories);
      setNsiSchemes(schemes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WordPress data');
      setDocCategories([]);
      setNsiSchemes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWordPressData();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            WordPress Categories & Schemes Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading WordPress data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Document Categories ({docCategories.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {docCategories.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No categories found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {docCategories.map((category) => (
                        <Badge
                          key={category.id}
                          variant="secondary"
                          className="text-xs mr-2 mb-2"
                        >
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* NSI Schemes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    NSI Schemes ({nsiSchemes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nsiSchemes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No schemes found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {nsiSchemes.map((scheme) => (
                        <Badge
                          key={scheme.id}
                          variant="outline"
                          className="text-xs mr-2 mb-2"
                        >
                          {scheme.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={loadWordPressData} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh Data
            </Button>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WordPressReferenceModal;