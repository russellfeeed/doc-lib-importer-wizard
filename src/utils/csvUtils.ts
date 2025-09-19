
import { DocumentFile, CSVData } from '@/types/document';
import { CircularLetter } from '@/types/circular-letter';

// Generate current year/month for WordPress upload URLs
const getCurrentUploadPath = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}/${month}`;
};

/**
 * Converts document data to CSV format
 */
export const generateCSV = (documents: DocumentFile[] | CircularLetter[]): string => {
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
      'Date',
      'Audience',
      'Title',
      'Details',
      'Document Authors',
      'Tags',
      'Categories',
      'Excerpt',
      'File URL',
      'Direct URL',
      'Featured Image URL',
      'File Size',
      'Content',
    ];
  } else {
    // Headers for regular documents
    headers = [
      'Name',
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
    ];
    
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
  
  // Add document rows (excluding omitted documents)
  documents
    .filter(doc => {
      // For circular letters, include all documents
      if (isCircularLetter) return true;
      // For regular documents, exclude if omitFromCSV is true
      const docFile = doc as DocumentFile;
      return !docFile.omitFromCSV;
    })
    .forEach(doc => {
    let row: Record<string, string> = {};
    
    if (isCircularLetter) {
      // Map circular letter properties
      const letter = doc as CircularLetter;
      row = {
        'Name': escapeCsvValue(letter.title),
        'Reference Number': escapeCsvValue(letter.referenceNumber),
        'Correspondence Ref': escapeCsvValue(letter.correspondenceRef),
        'Date': escapeCsvValue(letter.date),
        'Audience': escapeCsvValue(letter.audience),
        'Title': escapeCsvValue(letter.title),
        'Details': escapeCsvValue(letter.details),
        'Document Authors': escapeCsvValue(letter.author),
        'Tags': escapeCsvValue(letter.tags),
        'Categories': escapeCsvValue(letter.categories || ''),
        'Excerpt': forceQuoteCsvValue(letter.excerpt || ''),
        'File URL': escapeCsvValue(`https://dev.members.nsi.org.uk/wp-content/uploads/${getCurrentUploadPath()}/${letter.file?.name || letter.name}`),
        'Direct URL': escapeCsvValue(`https://dev.members.nsi.org.uk/wp-content/uploads/${getCurrentUploadPath()}/${letter.file?.name || letter.name}`),
        'Featured Image URL': escapeCsvValue(letter.thumbnail || ''),
        'File Size': escapeCsvValue(letter.fileSize),
        'Content': escapeCsvValue(letter.content),
      };
    } else {
      // Map document properties
      const docFile = doc as DocumentFile;
      row = {
        'Name': escapeCsvValue(docFile.name),
        'Categories': escapeCsvValue(docFile.categories),
        'Tags': escapeCsvValue(docFile.tags),
        'Document Authors': escapeCsvValue(docFile.authors),
        'File URL': escapeCsvValue(docFile.fileUrl || `https://dev.members.nsi.org.uk/wp-content/uploads/${getCurrentUploadPath()}/${docFile.file?.name || docFile.name}`),
        'Direct URL': escapeCsvValue(docFile.directUrl || `https://dev.members.nsi.org.uk/wp-content/uploads/${getCurrentUploadPath()}/${docFile.file?.name || docFile.name}`),
        'Featured Image URL': escapeCsvValue(docFile.imageUrl),
        'File Size': escapeCsvValue(docFile.fileSize),
        'Excerpt': forceQuoteCsvValue(docFile.excerpt),
        'Content': escapeCsvValue(docFile.content),
        'Published': docFile.published ? 'TRUE' : 'FALSE',
      };
      
      // Add custom fields if they exist
      if (docFile.customFields) {
        const customFieldKeys = Object.keys(docFile.customFields);
        customFieldKeys.forEach(key => {
          const displayKey = key.startsWith('cf:') ? key : `Custom Field ${key}`;
          row[displayKey] = escapeCsvValue(docFile.customFields[key] || '');
        });
      }
      
      // Add custom taxonomies if they exist
      if (docFile.customTaxonomies) {
        const customTaxonomyKeys = Object.keys(docFile.customTaxonomies);
        customTaxonomyKeys.forEach(key => {
          const displayKey = key.startsWith('tax:') ? key : `Custom Taxonomy ${key}`;
          row[displayKey] = escapeCsvValue(docFile.customTaxonomies[key] || '');
        });
      }
    }
    
    // Add row to CSV
    csv += headers.map(header => row[header] || '').join(',') + '\n';
  });
  
  return csv;
};

/**
 * Escapes values for CSV format
 */
const escapeCsvValue = (value: string): string => {
  if (!value) return '';
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
};

/**
 * Always wraps value in double quotes for CSV (used for excerpt field)
 */
const forceQuoteCsvValue = (value: string): string => {
  if (!value) return '""';
  
  // Always wrap in quotes and escape internal quotes
  return `"${value.replace(/"/g, '""')}"`;
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
