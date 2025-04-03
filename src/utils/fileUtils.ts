
/**
 * Generates a unique ID for file tracking
 */
export const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Formats file size in bytes to human-readable format (KB, MB, GB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Extracts file type from File object
 */
export const extractFileType = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Map common extensions to more readable formats
  const typeMap: Record<string, string> = {
    'pdf': 'PDF Document',
    'doc': 'Word Document',
    'docx': 'Word Document',
    'xls': 'Excel Spreadsheet',
    'xlsx': 'Excel Spreadsheet',
    'ppt': 'PowerPoint Presentation',
    'pptx': 'PowerPoint Presentation',
    'txt': 'Text Document',
    'rtf': 'Rich Text Document',
    'odt': 'OpenDocument Text',
  };
  
  return typeMap[extension] || file.type || 'Unknown';
};
