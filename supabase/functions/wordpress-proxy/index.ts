import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: fetch with Basic Auth, falling back to URL-embedded credentials
// if the server strips the Authorization header (returns rest_not_logged_in).
async function wpFetch(
  url: string,
  username: string,
  password: string,
  options: { method?: string; body?: string } = {}
): Promise<Response> {
  const authString = btoa(`${username}:${password}`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Supabase-Edge-Function',
    'Authorization': `Basic ${authString}`,
  };

  let response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    ...(options.body && { body: options.body }),
  });

  if (response.status === 401) {
    const bodyText = await response.text();
    if (bodyText.includes('rest_not_logged_in')) {
      console.log('Authorization header stripped by server, retrying with URL-embedded credentials');
      const urlObj = new URL(url);
      urlObj.username = username;
      urlObj.password = password;
      const { Authorization: _, ...headersWithoutAuth } = headers;
      response = await fetch(urlObj.toString(), {
        method: options.method || 'GET',
        headers: headersWithoutAuth as Record<string, string>,
        ...(options.body && { body: options.body }),
      });
      console.log(`Fallback auth response status: ${response.status}`);
    } else {
      // Re-wrap the already-consumed body into a new Response
      response = new Response(bodyText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  }

  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('WordPress proxy request received');
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    const { 
      url, 
      username, 
      password, 
      per_page = 100, 
      fields = 'id,name,parent,count',
      action = 'fetch', // 'fetch', 'create', 'fetch-taxonomy', or 'test-connection'
      categoryData, // for create action
      taxonomySlug, // for fetch-taxonomy action
      siteUrl // for test-connection action
    } = body;

    // Strip spaces from Application Passwords (WordPress displays them with spaces for readability)
    const cleanPassword = password ? password.replace(/\s+/g, '') : password;

    // Handle fetch-user-me action
    if (action === 'fetch-user-me') {
      if (!siteUrl || !username || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: siteUrl, username, password' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl = siteUrl.replace(/\/$/, '');
      
      try {
        const userMeResponse = await wpFetch(`${baseUrl}/wp-json/wp/v2/users/me`, username, cleanPassword);

        const responseData = await userMeResponse.json();
        console.log(`WordPress /users/me response status: ${userMeResponse.status}`);

        // Always return 200 so the client can read the response body;
        // include the original WP status for the caller to inspect.
        return new Response(JSON.stringify({
          wp_status: userMeResponse.status,
          ...responseData
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('WordPress /users/me error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch /users/me', details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle test connection action
    if (action === 'test-connection') {
      if (!siteUrl || !username || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for test: siteUrl, username, password' }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const baseUrl = siteUrl.replace(/\/$/, '');
      
      try {
        const testResponse = await wpFetch(`${baseUrl}/wp-json/wp/v2/types`, username, cleanPassword);

        console.log(`WordPress test response status: ${testResponse.status}`);
        
        if (testResponse.ok) {
          console.log('WordPress connection test successful');
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Connection successful - WordPress REST API is accessible'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          const errorText = await testResponse.text();
          console.log('WordPress connection test failed:', testResponse.status, errorText);
          
          let errorMessage = 'Connection failed';
          if (testResponse.status === 401) {
            errorMessage = 'Invalid credentials - please check username and password';
          } else if (testResponse.status === 403) {
            errorMessage = 'Insufficient permissions - user needs proper access rights';
          } else if (testResponse.status === 404) {
            errorMessage = 'WordPress REST API not found - please check the site URL';
          }
          
          return new Response(JSON.stringify({ 
            success: false, 
            message: errorMessage,
            details: errorText 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('WordPress connection test error:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Connection failed - unable to reach WordPress site',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle check taxonomies action
    if (action === 'check-taxonomies') {
      if (!siteUrl || !username || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: siteUrl, username, password' }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const baseUrl = siteUrl.replace(/\/$/, '');
      
      try {
        const taxonomyResponse = await wpFetch(`${baseUrl}/wp-json/wp/v2/taxonomies`, username, cleanPassword);

        console.log(`WordPress taxonomies response status: ${taxonomyResponse.status}`);
        
        if (taxonomyResponse.ok) {
          const taxonomies = await taxonomyResponse.json();
          console.log('Available taxonomies:', Object.keys(taxonomies));
          return new Response(JSON.stringify({ 
            success: true, 
            taxonomies: taxonomies,
            available_slugs: Object.keys(taxonomies)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          const errorText = await taxonomyResponse.text();
          console.log('WordPress taxonomies check failed:', taxonomyResponse.status, errorText);
          
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Failed to fetch available taxonomies',
            details: errorText 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('WordPress taxonomies check error:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to check taxonomies',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle fetch WordPress categories for a custom post type taxonomy
    if (action === 'fetch-wp-categories') {
      const site = url || siteUrl;
      if (!site || !username || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: url/siteUrl, username, password' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl = site.replace(/\/$/, '');
      const searchTerm = body.searchTerm || '';
      
      const slugsToTry = ['doc_categories'];
      const results: Record<string, any> = {};

      for (const slug of slugsToTry) {
        try {
          const catUrl = `${baseUrl}/wp-json/wp/v2/${slug}?per_page=100${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}&_fields=id,name,slug,parent,count,description`;
          console.log(`Trying taxonomy slug "${slug}": ${catUrl}`);
          
          const catResponse = await wpFetch(catUrl, username, cleanPassword);

          if (catResponse.ok) {
            const cats = await catResponse.json();
            const total = catResponse.headers.get('X-WP-Total') || String(cats.length);
            console.log(`Taxonomy "${slug}": ${cats.length} results (total: ${total})`);
            results[slug] = { success: true, categories: cats, total: parseInt(total, 10) };
          } else {
            console.log(`Taxonomy "${slug}" failed: ${catResponse.status}`);
            results[slug] = { success: false, status: catResponse.status };
          }
        } catch (e) {
          console.log(`Taxonomy "${slug}" error: ${e.message}`);
          results[slug] = { success: false, error: e.message };
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle fetch all DLP document titles (paginated)
    if (action === 'fetch-all-dlp-titles') {
      if (!url || !username || !password) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: url, username, password' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl = url.replace(/\/$/, '');
      
      try {
        const allDocuments: any[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const pageUrl = `${baseUrl}/wp-json/wp/v2/dlp_document?per_page=100&page=${page}&_fields=id,title,status,link,date,doc_categories`;
          console.log(`Fetching DLP documents page ${page}: ${pageUrl}`);
          
          const pageResponse = await wpFetch(pageUrl, username, cleanPassword);

          if (!pageResponse.ok) {
            const errorText = await pageResponse.text();
            console.error('DLP document fetch failed:', pageResponse.status, errorText);
            return new Response(JSON.stringify({ error: 'Failed to fetch DLP documents', details: errorText }), {
              status: pageResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          if (page === 1) {
            const totalPagesHeader = pageResponse.headers.get('X-WP-TotalPages');
            const totalItemsHeader = pageResponse.headers.get('X-WP-Total');
            totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;
            console.log(`Total DLP documents: ${totalItemsHeader || 'unknown'}, pages: ${totalPages}`);
          }

          const results = await pageResponse.json();
          allDocuments.push(...results);
          page++;
        }

        // Filter to only documents in target categories (649=System, 645=Service)
        const targetCategories = [649, 645];
        const filtered = allDocuments.filter(doc =>
          Array.isArray(doc.doc_categories) &&
          doc.doc_categories.some((id: number) => targetCategories.includes(id))
        );
        console.log(`Fetched ${allDocuments.length} total DLP documents, ${filtered.length} match categories ${targetCategories.join(',')}`);
        return new Response(JSON.stringify(filtered), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('DLP document fetch error:', error);
        return new Response(JSON.stringify({ error: 'Fetch failed', details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // For other actions, validate url/username/password
    if (!url || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: url, username, password' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Clean up URL and build WordPress API endpoint
    const baseUrl = url.replace(/\/$/, '');
    
    let wordpressUrl: string;
    let method: string;
    let requestBody: string | undefined;
    
    if (action === 'create') {
      // Create category endpoint
      wordpressUrl = `${baseUrl}/wp-json/wp/v2/doc_categories`;
      method = 'POST';
      requestBody = JSON.stringify(categoryData);
    } else if (action === 'fetch-taxonomy') {
      // Fetch taxonomy endpoint
      if (!taxonomySlug) {
        return new Response(
          JSON.stringify({ error: 'taxonomySlug is required for fetch-taxonomy action' }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      wordpressUrl = `${baseUrl}/wp-json/wp/v2/${taxonomySlug}?per_page=${per_page}&_fields=id,name,slug,description`;
      method = 'GET';
      console.log(`Fetching taxonomy ${taxonomySlug} from: ${wordpressUrl}`);
    } else {
      // Fetch categories endpoint (default)
      wordpressUrl = `${baseUrl}/wp-json/wp/v2/doc_categories?per_page=${per_page}&_fields=${fields}`;
      method = 'GET';
    }
    
    console.log(`Making ${method} request to: ${wordpressUrl}`);
    
    // Use the wpFetch helper which handles auth header fallback
    const response = await wpFetch(wordpressUrl, username, cleanPassword, {
      method,
      body: requestBody,
    });

    if (!response.ok) {
      console.error(`WordPress API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`WordPress API error details: ${errorText}`);
      
      let errorMessage = 'Failed to fetch WordPress data';
      
      if (action === 'fetch-taxonomy') {
        if (response.status === 404) {
          errorMessage = `Taxonomy '${taxonomySlug}' not found. This could mean:
          1. The taxonomy slug is incorrect
          2. The taxonomy is not exposed to the REST API
          3. You need to register the taxonomy with REST API support`;
        } else if (response.status === 401) {
          errorMessage = 'Invalid credentials for taxonomy access';
        } else if (response.status === 403) {
          errorMessage = 'Insufficient permissions to access taxonomies';
        }
      } else if (action === 'create') {
        errorMessage = 'Failed to create WordPress category';
        if (response.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (response.status === 403) {
          errorMessage = 'Insufficient permissions to manage categories';
        } else if (response.status === 404) {
          errorMessage = 'WordPress site not found or doc_categories taxonomy not available';
        } else if (response.status === 400) {
          errorMessage = 'Category already exists or invalid data';
        }
      } else {
        // fetch action
        if (response.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (response.status === 403) {
          errorMessage = 'Insufficient permissions to manage categories';
        } else if (response.status === 404) {
          errorMessage = 'WordPress site not found or doc_categories taxonomy not available';
        }
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }), 
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    
    if (action === 'create') {
      console.log(`Successfully created category in WordPress:`, data);
    } else {
      console.log(`Successfully fetched ${data.length} categories from WordPress`);
    }

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