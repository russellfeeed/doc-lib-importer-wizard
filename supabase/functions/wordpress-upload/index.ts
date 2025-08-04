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
    fileUrl: string;
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

    const uploadResults: UploadResult[] = [];

    for (const doc of documents) {
      try {
        console.log(`Uploading document: ${doc.name}`);

        // Download the file first
        const fileResponse = await fetch(doc.fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }

        const fileBlob = await fileResponse.blob();
        
        // Create form data for WordPress media upload
        const formData = new FormData();
        formData.append('file', fileBlob, doc.name);

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