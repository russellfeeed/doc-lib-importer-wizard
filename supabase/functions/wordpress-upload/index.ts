import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  documents: Array<{
    id: string;
    name: string;
    fileData: any; // Can be File object, base64 string, or other format
    fileType: string;
  }>;
  wpUrl: string;
  wpUsername: string;
  wpPassword: string;
}

interface UploadResult {
  id: string;
  success: boolean;
  wpMediaId?: number;
  wpUrl?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documents, wpUrl, wpUsername, wpPassword }: UploadRequest = await req.json();

    console.log(`Starting upload of ${documents.length} documents to WordPress`);

    // Create basic auth header
    const authHeader = btoa(`${wpUsername}:${wpPassword}`);

    // Function to check if file already exists in WordPress Media Library
    const checkFileExists = async (filename: string): Promise<{ exists: boolean; mediaId?: number; url?: string }> => {
      try {
        const searchResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(filename)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authHeader}`,
          },
        });

        if (searchResponse.ok) {
          const existingMedia = await searchResponse.json();
          if (Array.isArray(existingMedia) && existingMedia.length > 0) {
            // Check for exact filename match
            const exactMatch = existingMedia.find(media => 
              media.title?.rendered === filename || 
              media.slug === filename.toLowerCase().replace(/[^a-z0-9]/g, '-')
            );
            
            if (exactMatch) {
              return {
                exists: true,
                mediaId: exactMatch.id,
                url: exactMatch.source_url
              };
            }
          }
        }
        
        return { exists: false };
      } catch (error) {
        console.log(`Error checking if file exists: ${error.message}`);
        return { exists: false };
      }
    };

    const uploadResults: UploadResult[] = [];

    for (const doc of documents) {
      try {
        console.log(`Uploading document: ${doc.name}`);
        console.log(`File data type: ${typeof doc.fileData}`);
        console.log(`File data keys: ${doc.fileData && typeof doc.fileData === 'object' ? Object.keys(doc.fileData) : 'N/A'}`);

        // Convert file data to blob
        if (!doc.fileData) {
          throw new Error('No file data provided');
        }

        // Define valid file extensions and their MIME types
        const validExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt']);
        
        // Function to get proper file extension from filename or file type
        const getFileExtension = (filename: string, fileType: string): string => {
          // Check if filename already has a valid extension
          const parts = filename.split('.');
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].toLowerCase();
            if (validExtensions.has(lastPart)) {
              console.log(`Valid extension found in filename: ${lastPart}`);
              return lastPart;
            }
          }
          
          // No valid extension found, determine from file type
          const typeToExtensionMap: Record<string, string> = {
            'PDF Document': 'pdf',
            'Word Document': 'docx',
            'Excel Spreadsheet': 'xlsx',
            'PowerPoint Presentation': 'pptx',
            'Text Document': 'txt',
            'Rich Text Document': 'rtf',
            'OpenDocument Text': 'odt',
          };
          
          const extension = typeToExtensionMap[fileType] || 'pdf'; // Default to pdf
          console.log(`No valid extension in filename, using extension from file type: ${extension}`);
          return extension;
        };

        // Get the proper file extension
        const fileExtension = getFileExtension(doc.name, doc.fileType);
        
        // Map file types to proper MIME types
        const getMimeType = (fileType: string, extension: string): string => {
          const mimeTypeMap: Record<string, string> = {
            'PDF Document': 'application/pdf',
            'Word Document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Excel Spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'PowerPoint Presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Text Document': 'text/plain',
            'Rich Text Document': 'application/rtf',
            'OpenDocument Text': 'application/vnd.oasis.opendocument.text',
          };

          // First try to map by display name
          if (mimeTypeMap[fileType]) {
            return mimeTypeMap[fileType];
          }

          // Fall back to extension-based mapping
          const extensionMimeMap: Record<string, string> = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'rtf': 'application/rtf',
            'odt': 'application/vnd.oasis.opendocument.text',
          };

          return extensionMimeMap[extension] || 'application/octet-stream';
        };

        // Ensure filename has proper extension
        let filename = doc.name;
        if (!doc.name.toLowerCase().endsWith(`.${fileExtension}`)) {
          filename = `${doc.name}.${fileExtension}`;
        }

        const mimeType = getMimeType(doc.fileType, fileExtension);
        console.log(`Original filename: ${doc.name}`);
        console.log(`File extension: ${fileExtension}`);
        console.log(`Using MIME type: ${mimeType} for file type: ${doc.fileType}`);
        console.log(`Final filename: ${filename}`);

        // Check if file already exists in WordPress Media Library
        const existingFile = await checkFileExists(filename);
        if (existingFile.exists) {
          console.log(`File ${filename} already exists in WordPress Media Library with ID: ${existingFile.mediaId}`);
          uploadResults.push({
            id: doc.id,
            success: true,
            wpMediaId: existingFile.mediaId,
            wpUrl: existingFile.url,
          });
          continue; // Skip to next document
        }

        let fileBlob: Blob;
        
        // Handle different file data formats
        if (typeof doc.fileData === 'string') {
          // Handle base64 string
          const base64Data = doc.fileData.includes(',') 
            ? doc.fileData.split(',')[1] 
            : doc.fileData;

          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          fileBlob = new Blob([bytes], { type: mimeType });
        } else if (doc.fileData instanceof File) {
          // Handle File object - use original MIME type if available, otherwise use our mapping
          const finalMimeType = doc.fileData.type || mimeType;
          fileBlob = new Blob([doc.fileData], { type: finalMimeType });
        } else if (doc.fileData && typeof doc.fileData === 'object') {
          // Handle object with file data - might be a serialized File
          if (doc.fileData.type && doc.fileData.size !== undefined) {
            // This looks like a File-like object
            throw new Error('File objects cannot be serialized through JSON. Please convert to base64 string before sending.');
          } else {
            throw new Error(`Unsupported file data object format`);
          }
        } else {
          throw new Error(`Invalid file data format: expected string or File, got ${typeof doc.fileData}`);
        }
        
        // Create form data for WordPress media upload
        const formData = new FormData();
        formData.append('file', fileBlob, filename);

        // Upload to WordPress media library
        const uploadResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`WordPress upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const mediaData = await uploadResponse.json();

        uploadResults.push({
          id: doc.id,
          success: true,
          wpMediaId: mediaData.id,
          wpUrl: mediaData.source_url,
        });

        console.log(`Successfully uploaded ${doc.name} with media ID: ${mediaData.id}`);

      } catch (error) {
        console.error(`Failed to upload ${doc.name}:`, error);
        uploadResults.push({
          id: doc.id,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = uploadResults.filter(r => r.success).length;
    const failureCount = uploadResults.length - successCount;

    console.log(`Upload completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(JSON.stringify({
      results: uploadResults,
      summary: {
        total: documents.length,
        successful: successCount,
        failed: failureCount,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in wordpress-upload function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      results: [],
      summary: { total: 0, successful: 0, failed: 0 }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});