import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, Edit, Check, Zap, ExternalLink, AlertTriangle, Tags } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface DocumentsTableViewProps {
  documents: DocumentFile[];
  isGeneratingAI: boolean;
  isStandards?: boolean;
  onEditDocument: (index: number, field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  onGenerateAllExcerpts: (selectedIndices?: Set<number>) => void;
  onGenerateAllCategories?: (selectedIndices?: Set<number>) => void;
  onGenerateAllSchemes?: (selectedIndices?: Set<number>) => void;
  onGenerateAllTags: (selectedIndices?: Set<number>) => void;
  onToggleView: () => void;
  onSave: () => void;
  onBack: () => void;
  onToggleAllPublished: (published: boolean) => void;
}

const DocumentsTableView: React.FC<DocumentsTableViewProps> = ({
  documents,
  isGeneratingAI,
  isStandards = false,
  onEditDocument,
  onGenerateAllExcerpts,
  onGenerateAllCategories,
  onGenerateAllSchemes,
  onGenerateAllTags,
  onToggleView,
  onSave,
  onBack,
  onToggleAllPublished
}) => {
  const [selectedDocuments, setSelectedDocuments] = React.useState<Set<number>>(new Set());
  const [bulkOperationType, setBulkOperationType] = React.useState<'schemes' | 'tags' | 'excerpts' | 'categories' | null>(null);
  // Function to determine if a document needs attention
  const needsAttention = (doc: DocumentFile): { needs: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    
    // Check for AI processing errors
    if (doc.aiProcessing?.status === 'error') {
      reasons.push('AI processing failed');
    }
    
    // Check for missing excerpt/summary
    if (!doc.excerpt || doc.excerpt.trim() === '') {
      reasons.push('Missing excerpt');
    }
    
    // Check for uncategorized documents
    if (!doc.categories || doc.categories.trim() === '' || doc.categories.toLowerCase().includes('uncategorised')) {
      reasons.push('Needs categorization');
    }
    
    // Check for missing scheme (skip for standards documents)
    if (!isStandards && (!doc.customTaxonomies?.['tax:nsi-scheme'] || doc.customTaxonomies['tax:nsi-scheme'].trim() === '')) {
      reasons.push('Missing scheme');
    }
    
    // Check for missing tags
    if (!doc.tags || doc.tags.trim() === '') {
      reasons.push('Missing tags');
    }
    
    // Check for content extraction failures
    if (!doc.content || doc.content.includes('Failed to extract content')) {
      reasons.push('Content extraction failed');
    }
    
    // Check for incomplete processing
    if (doc.isProcessing) {
      reasons.push('Still processing');
    }
    
    return { needs: reasons.length > 0, reasons };
  };

  // Calculate if all documents are published
  const allPublished = documents.every(doc => doc.published);
  const somePublished = documents.some(doc => doc.published);
  
  // Count documents that need attention
  const documentsNeedingAttention = documents.filter(doc => needsAttention(doc).needs).length;
  
  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(documents.map((_, index) => index)));
    } else {
      setSelectedDocuments(new Set());
    }
  };
  
  const handleSelectDocument = (index: number, checked: boolean) => {
    const newSelection = new Set(selectedDocuments);
    if (checked) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    setSelectedDocuments(newSelection);
  };
  
  const allSelected = selectedDocuments.size === documents.length && documents.length > 0;
  const someSelected = selectedDocuments.size > 0;
  
  const handleSelectDocumentsNeedingAttention = () => {
    const indicesNeedingAttention = new Set<number>();
    documents.forEach((doc, index) => {
      const attention = needsAttention(doc);
      if (attention.needs) {
        indicesNeedingAttention.add(index);
      }
    });
    setSelectedDocuments(indicesNeedingAttention);
    console.log('Selected documents needing attention:', indicesNeedingAttention.size, 'out of', documents.length);
  };
  
  // Bulk action handlers
  const handleBulkGenerateSchemes = async () => {
    if (!onGenerateAllSchemes || selectedDocuments.size === 0) return;
    
    setBulkOperationType('schemes');
    try {
      await onGenerateAllSchemes(selectedDocuments);
    } finally {
      setBulkOperationType(null);
    }
  };
  
  
  const handleBulkGenerateExcerpts = async () => {
    if (selectedDocuments.size === 0) return;
    
    setBulkOperationType('excerpts');
    try {
      await onGenerateAllExcerpts(selectedDocuments);
    } finally {
      setBulkOperationType(null);
    }
  };
  
  const handleBulkGenerateCategories = async () => {
    if (!onGenerateAllCategories || selectedDocuments.size === 0) return;
    
    setBulkOperationType('categories');
    try {
      await onGenerateAllCategories(selectedDocuments);
    } finally {
      setBulkOperationType(null);
    }
  };
  
  const handleBulkGenerateTags = async () => {
    if (selectedDocuments.size === 0) return;
    
    setBulkOperationType('tags');
    try {
      await onGenerateAllTags(selectedDocuments);
    } finally {
      setBulkOperationType(null);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">All Documents</h3>
          {documentsNeedingAttention > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {documentsNeedingAttention} need attention
            </Badge>
          )}
          {someSelected && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {selectedDocuments.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="publish-all" className="text-sm font-medium">
              {allPublished ? 'Unpublish All' : 'Publish All'}
            </Label>
            <Switch
              id="publish-all"
              checked={allPublished}
              onCheckedChange={(checked) => onToggleAllPublished(checked)}
            />
          </div>
          <div className="flex space-x-2">
            {documentsNeedingAttention > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectDocumentsNeedingAttention}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Select Needing Attention ({documentsNeedingAttention})
              </Button>
            )}
            {someSelected && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkGenerateExcerpts}
                  disabled={isGeneratingAI || selectedDocuments.size === 0 || bulkOperationType === 'excerpts'}
                >
                  {(isGeneratingAI && bulkOperationType === 'excerpts') ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                      Generating Excerpts...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Generate Excerpts ({selectedDocuments.size})
                    </>
                  )}
                </Button>
                {onGenerateAllCategories && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkGenerateCategories}
                    disabled={isGeneratingAI || selectedDocuments.size === 0 || bulkOperationType === 'categories'}
                  >
                    {(isGeneratingAI && bulkOperationType === 'categories') ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                        Detecting Categories...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Detect Categories ({selectedDocuments.size})
                      </>
                    )}
                  </Button>
                )}
                {onGenerateAllSchemes && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkGenerateSchemes}
                    disabled={isGeneratingAI || selectedDocuments.size === 0 || bulkOperationType === 'schemes'}
                  >
                    {(isGeneratingAI && bulkOperationType === 'schemes') ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                        Generating Schemes...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate Schemes ({selectedDocuments.size})
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkGenerateTags}
                  disabled={isGeneratingAI || selectedDocuments.size === 0 || bulkOperationType === 'tags'}
                >
                  {(isGeneratingAI && bulkOperationType === 'tags') ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                      Generating Tags...
                    </>
                  ) : (
                    <>
                      <Tags className="mr-2 h-4 w-4" />
                      Generate Tags ({selectedDocuments.size})
                    </>
                  )}
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onToggleView}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Individual Documents
            </Button>
          </div>
        </div>
      </div>
      
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all documents"
                />
              </TableHead>
              {isStandards && <TableHead>Standard #</TableHead>}
              {isStandards && <TableHead>WP Status</TableHead>}
              {isStandards && <TableHead>Title</TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>Categories</TableHead>
              {!isStandards && <TableHead>Scheme</TableHead>}
              <TableHead>Tags</TableHead>
              <TableHead>Authors</TableHead>
              <TableHead>File Size</TableHead>
              <TableHead>Excerpt</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc, index) => {
              const attentionCheck = needsAttention(doc);
              return (
                <TableRow key={doc.id} className={attentionCheck.needs ? 'bg-destructive/5 border-destructive/20' : ''}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedDocuments.has(index)}
                      onCheckedChange={(checked) => handleSelectDocument(index, !!checked)}
                      aria-label={`Select ${doc.name}`}
                    />
                  </TableCell>
                  {isStandards && (
                    <TableCell>
                      <Input 
                        value={doc.standardNumber || ''}
                        onChange={(e) => onEditDocument(index, 'standardNumber', e.target.value)}
                        className="w-32"
                        placeholder="Standard #"
                      />
                    </TableCell>
                  )}
                  {isStandards && (
                    <TableCell>
                      {doc.wpExisting ? (
                        <a href={doc.wpExisting.link} target="_blank" rel="noopener noreferrer">
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
                            Exists in WP
                          </Badge>
                        </a>
                      ) : doc.wpExisting === null ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">New</Badge>
                      ) : (
                        <Badge variant="secondary">Not checked</Badge>
                      )}
                    </TableCell>
                  )}
                  {isStandards && (
                    <TableCell>
                      <Input 
                        value={doc.documentTitle || ''}
                        onChange={(e) => onEditDocument(index, 'documentTitle', e.target.value)}
                        className="w-40"
                        placeholder="Title"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={doc.name}
                        onChange={(e) => onEditDocument(index, 'name', e.target.value)}
                        className="w-full"
                      />
                      {attentionCheck.needs && (
                        <div title={`Issues: ${attentionCheck.reasons.join(', ')}`}>
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={doc.categories}
                      onChange={(e) => onEditDocument(index, 'categories', e.target.value)}
                      className={`w-full ${doc.categories?.toLowerCase().includes('uncategorised') ? 'border-destructive bg-destructive/10' : ''}`}
                    />
                    {doc.categories?.toLowerCase().includes('uncategorised') && (
                      <div className="text-xs text-destructive mt-1">Categorization failed</div>
                    )}
                  </TableCell>
                  {!isStandards && (
                    <TableCell>
                      <Input 
                        value={doc.customTaxonomies?.['tax:nsi-scheme'] || ''}
                        onChange={(e) => {
                          const updatedTaxonomies = { ...doc.customTaxonomies, 'tax:nsi-scheme': e.target.value };
                          onEditDocument(index, 'customTaxonomies', updatedTaxonomies);
                        }}
                        className={`w-full ${!doc.customTaxonomies?.['tax:nsi-scheme'] || doc.customTaxonomies['tax:nsi-scheme'].trim() === '' ? 'border-destructive bg-destructive/10' : ''}`}
                        placeholder="Scheme"
                      />
                      {(!doc.customTaxonomies?.['tax:nsi-scheme'] || doc.customTaxonomies['tax:nsi-scheme'].trim() === '') && (
                        <div className="text-xs text-destructive mt-1">Scheme missing</div>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Input 
                      value={doc.tags}
                      onChange={(e) => onEditDocument(index, 'tags', e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={doc.authors}
                      onChange={(e) => onEditDocument(index, 'authors', e.target.value)}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>{doc.fileSize}</TableCell>
                  <TableCell className="relative">
                    <div className="w-32 truncate" title={doc.excerpt}>
                      {doc.excerpt || "No excerpt"}
                    </div>
                    {doc.aiProcessing?.status === 'completed' && (
                      <Zap className="absolute top-1 right-1 h-3 w-3 text-green-500" />
                    )}
                    {doc.aiProcessing?.status === 'processing' && (
                      <div className="absolute top-1 right-1 animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={doc.published}
                      onCheckedChange={(checked) => onEditDocument(index, 'published', checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Create a preview of the document content
                        const previewContent = `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>${doc.name}</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                              .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                              .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                              .content { white-space: pre-wrap; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>${doc.name}</h1>
                            </div>
                            <div class="metadata">
                              <p><strong>Categories:</strong> ${doc.categories || 'N/A'}</p>
                              <p><strong>Tags:</strong> ${doc.tags || 'N/A'}</p>
                              <p><strong>Authors:</strong> ${doc.authors || 'N/A'}</p>
                              <p><strong>File Size:</strong> ${doc.fileSize}</p>
                              <p><strong>Published:</strong> ${doc.published ? 'Yes' : 'No'}</p>
                            </div>
                            <div class="content">
                              <h3>Excerpt:</h3>
                              <p>${doc.excerpt || 'No excerpt available'}</p>
                              
                              <h3>Content:</h3>
                              <p>${doc.content || 'No content available'}</p>
                            </div>
                          </body>
                          </html>
                        `;
                        
                        const blob = new Blob([previewContent], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        
                        // Clean up the object URL after a short delay
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                      }}
                      disabled={!doc.content && !doc.excerpt}
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onSave}>
          <Check className="mr-2 h-4 w-4" />
          Generate CSV
        </Button>
      </div>
    </div>
  );
};

export default DocumentsTableView;