
import { DocumentFile, CSVData } from '@/types/document';

/**
 * Converts document data to CSV format
 */
export const generateCSV = (documents: DocumentFile[]): string => {
  // Define headers based on Barn2 documentation
  const headers = [
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
    // Add standard custom fields here if needed
  ];
  
  // Get all unique custom field and taxonomy keys from all documents
  const customFieldKeys = new Set<string>();
  const customTaxonomyKeys = new Set<string>();
  
  documents.forEach(doc => {
    Object.keys(doc.customFields).forEach(key => customFieldKeys.add(key));
    Object.keys(doc.customTaxonomies).forEach(key => customTaxonomyKeys.add(key));
  });
  
  // Add custom field headers (prefixing with cf: as needed)
  customFieldKeys.forEach(key => {
    headers.push(key.startsWith('cf:') ? key : `Custom Field ${key}`);
  });
  
  // Add custom taxonomy headers (prefixing with tax: as needed)
  customTaxonomyKeys.forEach(key => {
    headers.push(key.startsWith('tax:') ? key : `Custom Taxonomy ${key}`);
  });
  
  // Create CSV header row
  let csv = headers.join(',') + '\n';
  
  // Add document rows
  documents.forEach(doc => {
    const row: CSVData = {
      'Name': escapeCsvValue(doc.name),
      'Categories': escapeCsvValue(doc.categories),
      'Tags': escapeCsvValue(doc.tags),
      'Document Authors': escapeCsvValue(doc.authors),
      'File URL': escapeCsvValue(doc.fileUrl),
      'Direct URL': escapeCsvValue(doc.directUrl),
      'Featured Image URL': escapeCsvValue(doc.imageUrl),
      'File Size': escapeCsvValue(doc.fileSize),
      'Excerpt': escapeCsvValue(doc.excerpt),
      'Content': escapeCsvValue(doc.content),
      'Published': doc.published ? 'TRUE' : 'FALSE',
    };
    
    // Add custom fields
    customFieldKeys.forEach(key => {
      const displayKey = key.startsWith('cf:') ? key : `Custom Field ${key}`;
      row[displayKey] = escapeCsvValue(doc.customFields[key] || '');
    });
    
    // Add custom taxonomies
    customTaxonomyKeys.forEach(key => {
      const displayKey = key.startsWith('tax:') ? key : `Custom Taxonomy ${key}`;
      row[displayKey] = escapeCsvValue(doc.customTaxonomies[key] || '');
    });
    
    // Add row to CSV
    csv += Object.values(row).join(',') + '\n';
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
