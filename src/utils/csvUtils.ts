
import { DocumentFile, CSVData } from '@/types/document';
import { CircularLetter } from '@/types/circular-letter';
import { hasOpenAIKey, summarizeWithOpenAI } from './openaiClient';
import { getWordPressSettings } from './settingsUtils';

// Get the WordPress site base URL, falling back to a default
const getWpBaseUrl = (): string => {
  const settings = getWordPressSettings();
  if (settings?.siteUrl) {
    return settings.siteUrl.replace(/\/+$/, '');
  }
  return 'https://dev.members.nsi.org.uk';
};

// Generate current year/month for WordPress upload URLs
const getCurrentUploadPath = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}/${month}`;
};

/**
 * Prepares content for CSV export using hybrid approach:
 * - Content < 10K: Use as-is
 * - Content 10K-30K: Smart truncate to ~10K
 * - Content > 30K: AI summarize to ~8K
 * @param content - The content to prepare
 * @param fileName - The filename for context
 * @param maxLength - Maximum length before processing (default: 10000)
 * @returns Promise of processed content with indicator if modified
 */
async function prepareContentForCSV(
  content: string, 
  fileName: string, 
  maxLength: number = 10000
): Promise<string> {
  if (!content) {
    return content;
  }
  
  const contentLength = content.length;
  
  // Content < 10K: Use as-is
  if (contentLength <= maxLength) {
    return content;
  }
  
  // Content 10K-30K: Smart truncate to preserve more original text
  if (contentLength <= 30000) {
    const truncated = content.substring(0, maxLength - 100);
    const lastPeriod = truncated.lastIndexOf('.');
    const smartTruncate = lastPeriod > maxLength * 0.8 
      ? truncated.substring(0, lastPeriod + 1)
      : truncated;
    
    return `[Truncated] ${smartTruncate}...`;
  }
  
  // Content > 30K: AI summarize for very large content
  if (hasOpenAIKey()) {
    try {
      const summary = await summarizeWithOpenAI(content, fileName, {
        maxTokens: 2000 // Roughly 8K characters for better searchability
      });
      return `[AI Summary] ${summary}`;
    } catch (error) {
      console.warn(`AI summarization failed for ${fileName}, falling back to truncation:`, error);
      // Fallback to truncation if AI fails
      const truncated = content.substring(0, maxLength - 100);
      const lastPeriod = truncated.lastIndexOf('.');
      const smartTruncate = lastPeriod > maxLength * 0.8 
        ? truncated.substring(0, lastPeriod + 1)
        : truncated;
      
      return `[Truncated] ${smartTruncate}...`;
    }
  }
  
  // No AI key available, truncate
  const truncated = content.substring(0, maxLength - 100);
  const lastPeriod = truncated.lastIndexOf('.');
  const smartTruncate = lastPeriod > maxLength * 0.8 
    ? truncated.substring(0, lastPeriod + 1)
    : truncated;
  
  return `[Truncated] ${smartTruncate}...`;
}

/**
 * Converts document data to CSV format
 * @param isStandards - If true, generates protected URLs with _pda path for standards documents
 * @param onProgress - Optional callback for progress updates
 */
export const generateCSV = async (
  documents: DocumentFile[] | CircularLetter[], 
  isStandards: boolean = false,
  onProgress?: (status: { current: number; total: number; message: string }) => void
): Promise<{ csv: string; processedCount: number }> => {
  // Check if we're working with circular letters
  const isCircularLetter = documents.length > 0 && 'referenceNumber' in documents[0];
  
  // Define headers based on document type
  let headers: string[] = [];
  
  if (isCircularLetter) {
    // Headers for circular letters
    headers = [
      'Name',
      'Reference Number',
      'Correspondence Ref',
      'Document Date',
      'Audience',
      'Content',
      'Document Authors',
      'Tags',
      'Categories',
      'Excerpt',
      'File URL',
      'Direct URL',
      'Featured Image URL',
      'File Size',
    ];
  } else {
    // Headers for regular documents
    headers = [
      'Name',
    ];
    
    
    headers.push(
      'Categories',
      'Tags',
      'Document Authors',
      'File URL',
      'Direct URL',
      'Featured Image URL',
      'File Size',
      'Excerpt',
      'Content',
      'Published',
    );
    
    // Get all unique custom field and taxonomy keys from all documents
    const customFieldKeys = new Set<string>();
    const customTaxonomyKeys = new Set<string>();
    
    documents.forEach(doc => {
      // Safely access customFields and customTaxonomies
      const docFile = doc as DocumentFile;
      if (docFile.customFields) {
        Object.keys(docFile.customFields).forEach(key => customFieldKeys.add(key));
      }
      if (docFile.customTaxonomies) {
        Object.keys(docFile.customTaxonomies).forEach(key => customTaxonomyKeys.add(key));
      }
    });
    
    // Add custom field headers (prefixing with cf: as needed)
    customFieldKeys.forEach(key => {
      headers.push(key.startsWith('cf:') ? key : `Custom Field ${key}`);
    });
    
    // Add custom taxonomy headers (prefixing with tax: as needed)
    customTaxonomyKeys.forEach(key => {
      headers.push(key.startsWith('tax:') ? key : `Custom Taxonomy ${key}`);
    });
  }
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Filter documents to process
  const filteredDocs = documents.filter(doc => {
    if (isCircularLetter) return true;
    const docFile = doc as DocumentFile;
    return !docFile.omitFromCSV;
  });
  
  let processedCount = 0;
  
  // Process documents one by one to handle async content preparation
  for (let i = 0; i < filteredDocs.length; i++) {
    const doc = filteredDocs[i];
    
    // Report progress
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: filteredDocs.length,
        message: `Processing ${i + 1} of ${filteredDocs.length}...`
      });
    }
    let row: Record<string, string> = {};
    
    if (isCircularLetter) {
      // Map circular letter properties
      const letter = doc as CircularLetter;
      
      // Prepare content (may be summarized if too large)
      const preparedDetails = await prepareContentForCSV(letter.details || '', letter.title);
      if (preparedDetails !== letter.details && preparedDetails.length < (letter.details || '').length) {
        processedCount++;
      }
      
      row = {
        'Name': forceQuoteCsvValue(letter.title),
        'Reference Number': forceQuoteCsvValue(letter.referenceNumber),
        'Correspondence Ref': forceQuoteCsvValue(letter.correspondenceRef),
        'Document Date': forceQuoteCsvValue(letter.date),
        'Audience': forceQuoteCsvValue(letter.audience),
        'Content': forceQuoteCsvValue(preparedDetails),
        'Document Authors': forceQuoteCsvValue(letter.author),
        'Tags': forceQuoteCsvValue((() => { const dateTag = new Date().toISOString().split('T')[0]; return letter.tags ? `${letter.tags}, ${dateTag}` : dateTag; })()),
        'Categories': forceQuoteCsvValue(letter.categories || ''),
        'Excerpt': forceQuoteCsvValue(letter.excerpt || ''),
        'File URL': forceQuoteCsvValue(`${getWpBaseUrl()}/wp-content/uploads/${getCurrentUploadPath()}/${letter.file?.name || letter.name}`),
        'Direct URL': forceQuoteCsvValue(`${getWpBaseUrl()}/wp-content/uploads/${getCurrentUploadPath()}/${letter.file?.name || letter.name}`),
        'Featured Image URL': forceQuoteCsvValue(letter.thumbnail || ''),
        'File Size': forceQuoteCsvValue(letter.fileSize),
      };
    } else {
      // Map document properties
      const docFile = doc as DocumentFile;
      
      // Prepare content (may be summarized if too large)
      const preparedContent = await prepareContentForCSV(docFile.content || '', docFile.name);
      if (preparedContent !== docFile.content && preparedContent.length < (docFile.content || '').length) {
        processedCount++;
      }
      
      // Generate URLs - for standards, match the WordPress upload filename exactly
      let urlFileName: string;
      
      if (isStandards) {
        // Build the same uploadName as WordPressUploader
        const originalExt = docFile.file?.name?.split('.').pop()?.toLowerCase() || 'pdf';
        let uploadName = docFile.standardNumber
          ? `${docFile.standardNumber} - ${docFile.name}`
          : docFile.name;
        
        // Replace em/en dashes with simple hyphens and strip plus signs
        uploadName = uploadName.replace(/[–—]/g, '-').replace(/\+/g, '').replace(/\//g, '-');
        
        // Ensure file extension
        if (!uploadName.toLowerCase().endsWith(`.${originalExt}`)) {
          uploadName = `${uploadName}.${originalExt}`;
        }
        
        // Apply WordPress-style sanitization: lowercase, spaces to hyphens, strip special chars
        urlFileName = uploadName
          .replace(/\s+/g, '-')
          .replace(/[:]/g, '')
          .replace(/[^a-zA-Z0-9.\-]/g, '-')
          .replace(/-+/g, '-');
      } else {
        urlFileName = docFile.file?.name || docFile.name;
      }
      
      // For standards: File URL is relative path, Direct URL is full URL
      const baseUrl = getWpBaseUrl();
      const fileUrlPath = isStandards 
        ? `/wp-content/uploads/_pda/${getCurrentUploadPath()}/${urlFileName}`
        : `${baseUrl}/wp-content/uploads/${getCurrentUploadPath()}/${urlFileName}`;
      
      const directUrlPath = isStandards 
        ? `${baseUrl}/wp-content/uploads/_pda/${getCurrentUploadPath()}/${urlFileName}`
        : `${baseUrl}/wp-content/uploads/${getCurrentUploadPath()}/${urlFileName}`;
      
      row = {
        'Name': forceQuoteCsvValue(
          isStandards && docFile.standardNumber 
            ? `${docFile.standardNumber} - ${docFile.name}` 
            : docFile.name
        ),
      };
      
      
      row['Categories'] = forceQuoteCsvValue(docFile.categories);
      const dateTag = new Date().toISOString().split('T')[0];
      const tagsWithDate = docFile.tags ? `${docFile.tags}, ${dateTag}` : dateTag;
      row['Tags'] = forceQuoteCsvValue(tagsWithDate);
      row['Document Authors'] = forceQuoteCsvValue(docFile.authors);
      row['File URL'] = forceQuoteCsvValue(fileUrlPath);
      row['Direct URL'] = forceQuoteCsvValue(directUrlPath);
      row['Featured Image URL'] = forceQuoteCsvValue(docFile.imageUrl);
      row['File Size'] = forceQuoteCsvValue(docFile.fileSize);
      row['Excerpt'] = forceQuoteCsvValue(docFile.excerpt);
      row['Content'] = forceQuoteCsvValue(preparedContent);
      row['Published'] = docFile.published ? 'TRUE' : 'FALSE';
      
      // Add custom fields if they exist
      if (docFile.customFields) {
        const customFieldKeys = Object.keys(docFile.customFields);
        customFieldKeys.forEach(key => {
          const displayKey = key.startsWith('cf:') ? key : `Custom Field ${key}`;
          row[displayKey] = forceQuoteCsvValue(docFile.customFields[key] || '');
        });
      }
      
      // Add custom taxonomies if they exist
      if (docFile.customTaxonomies) {
        const customTaxonomyKeys = Object.keys(docFile.customTaxonomies);
        customTaxonomyKeys.forEach(key => {
          const displayKey = key.startsWith('tax:') ? key : `Custom Taxonomy ${key}`;
          row[displayKey] = forceQuoteCsvValue(docFile.customTaxonomies[key] || '');
        });
      }
    }
    
    // Add row to CSV
    csv += headers.map(header => row[header] || '""').join(',') + '\n';
  }
  
  return { csv, processedCount };
};

/**
 * Escapes values for CSV format
 */
const escapeCsvValue = (value: string): string => {
  if (!value) return '';
  const cleaned = cleanText(value);
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  return cleaned;
};

/**
 * Normalizes Unicode and strips non-ASCII characters for clean CSV output
 */
const cleanText = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/[\u2018\u2019\u201A\u2032\u0060]/g, "'")   // smart single quotes → '
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')           // smart double quotes → "
    .replace(/[\u2013\u2014\u2015]/g, '-')                 // en/em dashes → -
    .replace(/\u2026/g, '...')                              // ellipsis → ...
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "");
};

/**
 * Always wraps value in double quotes for CSV (used for excerpt field)
 */
const forceQuoteCsvValue = (value: string): string => {
  if (!value) return '""';
  return `"${cleanText(value).replace(/"/g, '""')}"`;
};

/**
 * Copies text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for browsers without clipboard API
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (!successful) throw new Error('Unable to copy to clipboard');
    } finally {
      document.body.removeChild(textarea);
    }
  }
};
