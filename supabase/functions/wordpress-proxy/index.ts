import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('WordPress proxy request received');
    
    // WordPress API endpoint
    const wordpressUrl = 'https://dev.members.nsi.org.uk/wp-json/wp/v2/doc_categories?per_page=100&_fields=id,name,parent,count';
    
    // Make request to WordPress API
    const response = await fetch(wordpressUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!response.ok) {
      console.error(`WordPress API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch WordPress categories' }), 
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.length} categories from WordPress`);

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('WordPress proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});