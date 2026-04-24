import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Authenticate via wp-login.php and return session cookies + nonce
async function getWpSessionAuth(
  baseUrl: string,
  username: string,
  password: string
): Promise<{ cookies: string; nonce: string } | null> {
  try {
    console.log('Attempting cookie-based WordPress authentication...');
    
    // Step 1: POST to wp-login.php to get session cookies
    const loginBody = new URLSearchParams({
      log: username,
      pwd: password,
      'wp-submit': 'Log In',
      redirect_to: `${baseUrl}/wp-admin/`,
      testcookie: '1',
    });

    const loginResponse = await fetch(`${baseUrl}/wp-login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Supabase-Edge-Function',
        'Cookie': 'wordpress_test_cookie=WP%20Cookie%20check',
      },
      body: loginBody.toString(),
      redirect: 'manual', // Don't follow redirects, we need the Set-Cookie headers
    });

    console.log(`wp-login.php response status: ${loginResponse.status}`);

    // Collect Set-Cookie headers
    const setCookieHeaders: string[] = [];
    loginResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        setCookieHeaders.push(value);
      }
    });

    if (setCookieHeaders.length === 0) {
      console.log('No cookies received from wp-login.php');
      return null;
    }

    // Parse cookies into a single cookie string
    const cookieParts = setCookieHeaders.map(c => c.split(';')[0]);
    const cookieString = cookieParts.join('; ');
    console.log(`Got ${cookieParts.length} cookies from wp-login.php`);

    // Step 2: Fetch the REST API nonce from wp-admin
    const adminResponse = await fetch(`${baseUrl}/wp-admin/admin-ajax.php?action=rest-nonce`, {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Supabase-Edge-Function',
      },
    });

    let nonce = '';
    if (adminResponse.ok) {
      nonce = (await adminResponse.text()).trim();
      console.log(`Got REST nonce: ${nonce}`);
    } else {
      // Try getting nonce from wp-admin page as fallback
      console.log('rest-nonce action not available, trying wp-admin page...');
      const adminPageResponse = await fetch(`${baseUrl}/wp-admin/`, {
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Supabase-Edge-Function',
        },
      });
      const adminHtml = await adminPageResponse.text();
      const nonceMatch = adminHtml.match(/wpApiSettings["\s]*?:.*?"nonce"\s*:\s*"([a-f0-9]+)"/);
      if (nonceMatch) {
        nonce = nonceMatch[1];
        console.log(`Got REST nonce from admin page: ${nonce}`);
      }
    }

    if (!nonce) {
      console.log('Could not obtain REST API nonce');
      return null;
    }

    return { cookies: cookieString, nonce };
  } catch (error) {
    console.error('Cookie-based auth failed:', error);
    return null;
  }
}

// Helper: fetch with Basic Auth, falling back to cookie-based auth
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
      console.log('Authorization header stripped by server, trying URL-embedded credentials...');
      
      // Attempt 2: URL-embedded credentials (user:pass@host)
      const urlObj = new URL(url);
      urlObj.username = encodeURIComponent(username);
      urlObj.password = encodeURIComponent(password);
      
      const urlEmbedHeaders: Record<string, string> = {
        'User-Agent': 'Supabase-Edge-Function',
      };
      if (options.body) urlEmbedHeaders['Content-Type'] = 'application/json';
      
      response = await fetch(urlObj.toString(), {
        method: options.method || 'GET',
        headers: urlEmbedHeaders,
        ...(options.body && { body: options.body }),
      });
      console.log(`URL-embedded auth response status: ${response.status}`);
      
      if (response.status === 401) {
        const bodyText2 = await response.text();
        if (bodyText2.includes('rest_not_logged_in')) {
          console.log('URL-embedded auth also failed, trying cookie-based auth...');
          
          const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
          const session = await getWpSessionAuth(baseUrl, username, password);
          if (session) {
            const cookieHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              'User-Agent': 'Supabase-Edge-Function',
              'Cookie': session.cookies,
              'X-WP-Nonce': session.nonce,
            };
            
            response = await fetch(url, {
              method: options.method || 'GET',
              headers: cookieHeaders,
              ...(options.body && { body: options.body }),
            });
            console.log(`Cookie-based auth response status: ${response.status}`);
          } else {
            response = new Response(bodyText2, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }
        } else {
          response = new Response(bodyText2, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      }
    } else {
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
        return new Response(JSON.stringify({ error: 'Failed to fetch /users/me', details: (error as Error).message }), {
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
          details: (error as Error).message 
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
          details: (error as Error).message 
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
          console.log(`Taxonomy "${slug}" error: ${(e as Error).message}`);
          results[slug] = { success: false, error: (e as Error).message };
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
        return new Response(JSON.stringify({ error: 'Fetch failed', details: (error as Error).message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle fetch DLP documents filtered by a single doc_categories ID, with resolved file URLs
    if (action === 'fetch-dlp-by-category') {
      const categoryId = body.categoryId;
      if (!url || !username || !password || !categoryId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: url, username, password, categoryId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrlCat = url.replace(/\/$/, '');

      try {
        const allDocs: any[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const pageUrl = `${baseUrlCat}/wp-json/wp/v2/dlp_document?per_page=100&page=${page}&doc_categories=${categoryId}&_fields=id,title,link,status,content,meta`;
          console.log(`[fetch-dlp-by-category] page ${page}: ${pageUrl}`);
          const pageResponse = await wpFetch(pageUrl, username, cleanPassword);
          if (!pageResponse.ok) {
            const errorText = await pageResponse.text();
            console.error('[fetch-dlp-by-category] failed:', pageResponse.status, errorText);
            return new Response(JSON.stringify({ error: 'Failed to fetch DLP documents by category', details: errorText }), {
              status: pageResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          if (page === 1) {
            const tp = pageResponse.headers.get('X-WP-TotalPages');
            totalPages = tp ? parseInt(tp, 10) : 1;
            const ti = pageResponse.headers.get('X-WP-Total');
            console.log(`[fetch-dlp-by-category] total: ${ti || '?'}, pages: ${totalPages}`);
          }
          const results = await pageResponse.json();
          allDocs.push(...results);
          page++;
        }

        // Collect attached media IDs
        const mediaIds = new Set<number>();
        for (const doc of allDocs) {
          const m = doc?.meta?._dlp_attached_file_id;
          if (m && Number(m) > 0) mediaIds.add(Number(m));
        }

        // Batch fetch media (chunks of 50)
        const mediaMap: Record<number, { source_url: string; mime_type: string }> = {};
        const idArr = Array.from(mediaIds);
        for (let i = 0; i < idArr.length; i += 50) {
          const chunk = idArr.slice(i, i + 50);
          if (chunk.length === 0) continue;
          const mediaUrl = `${baseUrlCat}/wp-json/wp/v2/media?include=${chunk.join(',')}&per_page=${chunk.length}&_fields=id,source_url,mime_type`;
          try {
            const mr = await wpFetch(mediaUrl, username, cleanPassword);
            if (mr.ok) {
              const items = await mr.json();
              for (const m of items) {
                mediaMap[m.id] = { source_url: m.source_url || '', mime_type: m.mime_type || '' };
              }
            } else {
              console.warn(`[fetch-dlp-by-category] media chunk failed: ${mr.status}`);
            }
          } catch (e: any) {
            console.warn(`[fetch-dlp-by-category] media chunk error: ${(e as Error).message}`);
          }
        }

        // Build response: try meta first, then scrape content for a download URL as fallback
        const docs = allDocs.map((doc) => {
          const mid = doc?.meta?._dlp_attached_file_id ? Number(doc.meta._dlp_attached_file_id) : 0;
          let fileUrl = mid && mediaMap[mid] ? mediaMap[mid].source_url : '';
          let mimeType = mid && mediaMap[mid] ? mediaMap[mid].mime_type : '';

          if (!fileUrl) {
            // Fallback: scrape href from rendered content
            const rendered = doc?.content?.rendered || '';
            // Look for a link to a pdf/file or to ?dlp-listing-action=download
            const m1 = rendered.match(/href="([^"]+\.pdf[^"]*)"/i);
            const m2 = !m1 ? rendered.match(/href="([^"]*dlp-listing-action=download[^"]*)"/i) : null;
            const m3 = !m1 && !m2 ? rendered.match(/href="([^"]*\/wp-content\/uploads\/[^"]+)"/i) : null;
            fileUrl = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || '';
            if (fileUrl) {
              fileUrl = fileUrl.replace(/&amp;/g, '&');
            }
          }

          return {
            id: doc.id,
            title: doc?.title?.rendered || '',
            link: doc.link || '',
            status: doc.status || '',
            mediaId: mid,
            fileUrl,
            mimeType,
          };
        });

        return new Response(JSON.stringify({ documents: docs, total: docs.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('[fetch-dlp-by-category] error:', error);
        return new Response(JSON.stringify({ error: 'Fetch failed', details: (error as Error).message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Probe a document URL to verify it returns a real PDF.
    // Auth-aware: if a DLP-protected URL needs login, we send the WP credentials.
    if (action === 'check-document-url') {
      const checkUrl: string = body.checkUrl;
      if (!checkUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: checkUrl' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const controller = new AbortController();
      const timeoutMs = 12000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const result = {
        ok: false as boolean,
        status: 0 as number,
        finalUrl: '' as string,
        contentType: '' as string,
        contentLength: 0 as number,
        isPdf: false as boolean,
        isHtml: false as boolean,
        redirectedToHtm: false as boolean,
        error: '' as string,
        magic: '' as string,
      };

      try {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Lovable URL Audit)',
          'Accept': '*/*',
          'Range': 'bytes=0-2047',
        };
        // Use Basic auth so DLP-protected files behind login still resolve
        if (username && cleanPassword) {
          headers['Authorization'] = `Basic ${btoa(`${username}:${cleanPassword}`)}`;
        }

        const resp = await fetch(checkUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers,
        });
        clearTimeout(timer);

        result.status = resp.status;
        result.finalUrl = resp.url || checkUrl;
        result.contentType = (resp.headers.get('content-type') || '').toLowerCase();
        const cl = resp.headers.get('content-length');
        result.contentLength = cl ? parseInt(cl, 10) : 0;

        const lowerFinal = result.finalUrl.toLowerCase().split('?')[0];
        result.redirectedToHtm = /\.html?$/.test(lowerFinal);
        result.isHtml = result.contentType.includes('text/html');

        // Read first chunk to check magic bytes
        try {
          const buf = await resp.arrayBuffer();
          const bytes = new Uint8Array(buf).slice(0, 8);
          const magic = String.fromCharCode(...bytes);
          result.magic = magic;
          if (magic.startsWith('%PDF-')) {
            result.isPdf = true;
          } else if (magic.includes('<!DOC') || magic.includes('<html') || magic.includes('<HTML')) {
            result.isHtml = true;
          }
        } catch (_e) {
          // ignore body read failures
        }

        // Definition of OK: 2xx + (PDF magic OR content-type pdf) + not redirected to .htm
        const ctIsPdf = result.contentType.includes('application/pdf') || result.contentType.includes('application/octet-stream');
        result.ok = resp.status >= 200 && resp.status < 300 && (result.isPdf || ctIsPdf) && !result.redirectedToHtm && !result.isHtml;
      } catch (e: any) {
        clearTimeout(timer);
        result.error = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch failed');
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle fetch single DLP document detail with resolved terms
    if (action === 'fetch-dlp-detail') {
      const docId = body.documentId;
      if (!url || !username || !password || !docId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: url, username, password, documentId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl2 = url.replace(/\/$/, '');

      try {
        // Fetch the document
        const docUrl = `${baseUrl2}/wp-json/wp/v2/dlp_document/${docId}?_fields=id,title,excerpt,status,link,date,doc_categories,doc_tags`;
        console.log(`Fetching DLP document detail: ${docUrl}`);
        const docResponse = await wpFetch(docUrl, username, cleanPassword);

        if (!docResponse.ok) {
          const errorText = await docResponse.text();
          return new Response(JSON.stringify({ error: 'Failed to fetch document detail', details: errorText }), {
            status: docResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const doc = await docResponse.json();

        // Resolve category IDs to names
        let categoryNames: string[] = [];
        if (Array.isArray(doc.doc_categories) && doc.doc_categories.length > 0) {
          const catIds = doc.doc_categories.join(',');
          const catUrl = `${baseUrl2}/wp-json/wp/v2/doc_categories?include=${catIds}&_fields=id,name`;
          const catResp = await wpFetch(catUrl, username, cleanPassword);
          if (catResp.ok) {
            const cats = await catResp.json();
            categoryNames = cats.map((c: any) => c.name);
          }
        }

        // Resolve tag IDs to names
        let tagNames: string[] = [];
        if (Array.isArray(doc.doc_tags) && doc.doc_tags.length > 0) {
          const tagIds = doc.doc_tags.join(',');
          const tagUrl = `${baseUrl2}/wp-json/wp/v2/doc_tags?include=${tagIds}&_fields=id,name`;
          const tagResp = await wpFetch(tagUrl, username, cleanPassword);
          if (tagResp.ok) {
            const tags = await tagResp.json();
            tagNames = tags.map((t: any) => t.name);
          }
        }

        const result = {
          id: doc.id,
          title: doc.title?.rendered || '',
          excerpt: doc.excerpt?.rendered || '',
          categories: categoryNames.join(', '),
          tags: tagNames.join(', '),
          status: doc.status || '',
          link: doc.link || '',
          date: doc.date || '',
        };

        console.log(`DLP detail resolved: categories=[${categoryNames}], tags=[${tagNames}]`);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('DLP document detail error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch document detail', details: (error as Error).message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle upload-media-only action (Step 1: upload file to Media Library)
    if (action === 'upload-media-only') {
      const { fileData, fileName, fileType } = body;
      if (!url || !username || !password || !fileData || !fileName) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for upload-media-only' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl3 = url.replace(/\/$/, '');

      try {
        console.log(`[upload-media-only] Uploading file "${fileName}"...`);

        const binaryStr = atob(fileData);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const formData = new FormData();
        formData.append('file', new Blob([bytes], { type: fileType || 'application/pdf' }), fileName);

        const authString = btoa(`${username}:${cleanPassword}`);
        const mediaResponse = await fetch(`${baseUrl3}/wp-json/wp/v2/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'User-Agent': 'Supabase-Edge-Function',
          },
          body: formData,
        });

        if (!mediaResponse.ok) {
          const mediaErr = await mediaResponse.text();
          console.error('[upload-media-only] Media upload failed:', mediaResponse.status, mediaErr);
          return new Response(
            JSON.stringify({ error: 'Failed to upload file to WordPress media library', details: mediaErr }),
            { status: mediaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const mediaResult = await mediaResponse.json();
        const sourceUrl = mediaResult.source_url || '';
        console.log(`[upload-media-only] Success. Media ID: ${mediaResult.id}, source_url: ${sourceUrl}`);

        // Derive _pda protected path
        const pdaUrl = sourceUrl.includes('/_pda/') ? sourceUrl : sourceUrl.replace('/wp-content/uploads/', '/wp-content/uploads/_pda/');
        const urlObj2 = new URL(pdaUrl);
        const relativePdaPath = pdaUrl.replace(`${urlObj2.protocol}//${urlObj2.host}`, '');

        return new Response(JSON.stringify({
          success: true,
          mediaId: mediaResult.id,
          sourceUrl,
          pdaUrl,
          relativePdaPath,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('[upload-media-only] error:', error);
        return new Response(
          JSON.stringify({ error: 'Media upload failed', details: (error as Error).message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle create-and-replace-dlp action (Step 2: resolve terms, create new doc, trash old)
    // Also accept legacy 'update-dlp-only' name for backward compatibility
    if (action === 'create-and-replace-dlp' || action === 'update-dlp-only') {
      const { documentId, mediaId, title, excerpt, categories, tags } = body;
      if (!url || !username || !password || !documentId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for create-and-replace-dlp' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl3 = url.replace(/\/$/, '');

      try {
        // Resolve category and tag names to term IDs
        const resolveTermIds = async (names: string, taxonomy: string, createIfMissing: boolean = false): Promise<{ ids: number[]; resolved: Record<string, number | null> }> => {
          const resolved: Record<string, number | null> = {};
          if (!names || !names.trim()) return { ids: [], resolved };
          const termNames = names.split(',').map(n => n.trim()).filter(Boolean);
          const ids: number[] = [];
          for (const name of termNames) {
            try {
              const searchName = name.includes(' > ') ? name.split(' > ').pop()!.trim() : name;
              const searchUrl = `${baseUrl3}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(searchName)}&_fields=id,name,slug`;
              const resp = await wpFetch(searchUrl, username, cleanPassword);
              if (resp.ok) {
                const results = await resp.json();
                let match = results.find((r: any) => r.name.toLowerCase() === searchName.toLowerCase());
                if (!match) {
                  const slug = searchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  match = results.find((r: any) => r.slug === slug);
                }
                if (match) {
                  ids.push(match.id);
                  resolved[name] = match.id;
                  console.log(`[create-and-replace-dlp] Resolved "${name}" → ID ${match.id} (${taxonomy})`);
                } else if (createIfMissing) {
                  // Create the term if it doesn't exist
                  console.log(`[create-and-replace-dlp] Creating missing term "${searchName}" in ${taxonomy}`);
                  const createResp = await wpFetch(`${baseUrl3}/wp-json/wp/v2/${taxonomy}`, username, cleanPassword, {
                    method: 'POST',
                    body: JSON.stringify({ name: searchName }),
                  });
                  if (createResp.ok) {
                    const created = await createResp.json();
                    ids.push(created.id);
                    resolved[name] = created.id;
                    console.log(`[create-and-replace-dlp] Created "${searchName}" → ID ${created.id} (${taxonomy})`);
                  } else {
                    console.error(`[create-and-replace-dlp] Failed to create term "${searchName}": ${createResp.status}`);
                    resolved[name] = null;
                  }
                } else {
                  resolved[name] = null;
                  console.log(`[create-and-replace-dlp] No match for "${name}" in ${taxonomy}. Search returned: ${JSON.stringify(results.map((r: any) => r.name))}`);
                }
              }
            } catch (e) {
              console.error(`[create-and-replace-dlp] Failed to resolve term "${name}" in ${taxonomy}:`, e);
              resolved[name] = null;
            }
          }
          return { ids, resolved };
        };

        const dateTag = new Date().toISOString().split('T')[0];
        const tagsWithDate = tags ? `${tags}, ${dateTag}` : dateTag;
        console.log(`[create-and-replace-dlp] Resolving categories: "${categories}", tags: "${tagsWithDate}"`);
        const catResult = await resolveTermIds(categories || '', 'doc_categories');
        const tagResult = await resolveTermIds(tagsWithDate, 'doc_tags', true);
        console.log(`[create-and-replace-dlp] Resolved categories: [${catResult.ids}], tags: [${tagResult.ids}]`);

        // Build create body for new document
        const createBody: Record<string, any> = {
          title: title || '',
          excerpt: excerpt || '',
          status: 'publish',
        };
        if (catResult.ids.length > 0) createBody.doc_categories = catResult.ids;
        if (tagResult.ids.length > 0) createBody.doc_tags = tagResult.ids;
        if (mediaId) {
          createBody.meta = {
            _dlp_attached_file_id: mediaId,
            _dlp_document_link_type: 'file',
          };
        }

        // Create new DLP document
        console.log(`[create-and-replace-dlp] Creating new DLP document...`);
        const createResponse = await wpFetch(
          `${baseUrl3}/wp-json/wp/v2/dlp_document`,
          username,
          cleanPassword,
          { method: 'POST', body: JSON.stringify(createBody) }
        );

        if (!createResponse.ok) {
          const createErr = await createResponse.text();
          console.error('[create-and-replace-dlp] Create failed:', createResponse.status, createErr);
          return new Response(
            JSON.stringify({ error: 'Failed to create new DLP document', details: createErr }),
            { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const createResult = await createResponse.json();
        const newDocumentId = createResult.id;
        console.log(`[create-and-replace-dlp] New document created: ID ${newDocumentId}`);
        console.log(`[create-and-replace-dlp] Create response meta:`, JSON.stringify(createResult.meta || {}));

        // Step: Try to set file meta via separate POST update
        let metaUpdateSuccess = false;
        if (mediaId) {
          try {
            console.log(`[create-and-replace-dlp] Attempting separate meta update for document ${newDocumentId}...`);
            
            // Attempt 1: meta object
            const metaBody1 = { meta: { _dlp_attached_file_id: mediaId, _dlp_document_link_type: 'file' } };
            const metaRes1 = await wpFetch(
              `${baseUrl3}/wp-json/wp/v2/dlp_document/${newDocumentId}`,
              username, cleanPassword,
              { method: 'POST', body: JSON.stringify(metaBody1) }
            );
            const metaResult1 = metaRes1.ok ? await metaRes1.json() : null;
            console.log(`[create-and-replace-dlp] Meta update attempt 1 (meta object): ${metaRes1.status}`, JSON.stringify(metaResult1?.meta || {}));

            if (metaResult1?.meta?._dlp_attached_file_id == mediaId) {
              metaUpdateSuccess = true;
              console.log(`[create-and-replace-dlp] Meta update SUCCESS via meta object`);
            } else {
              // Attempt 2: top-level fields (some plugins register meta as top-level REST fields)
              console.log(`[create-and-replace-dlp] Meta object didn't stick, trying top-level fields...`);
              const metaBody2 = { _dlp_attached_file_id: mediaId, _dlp_document_link_type: 'file' };
              const metaRes2 = await wpFetch(
                `${baseUrl3}/wp-json/wp/v2/dlp_document/${newDocumentId}`,
                username, cleanPassword,
                { method: 'POST', body: JSON.stringify(metaBody2) }
              );
              const metaResult2 = metaRes2.ok ? await metaRes2.json() : null;
              console.log(`[create-and-replace-dlp] Meta update attempt 2 (top-level): ${metaRes2.status}`, JSON.stringify(metaResult2?.meta || {}));
              
              if (metaResult2?.meta?._dlp_attached_file_id == mediaId) {
                metaUpdateSuccess = true;
                console.log(`[create-and-replace-dlp] Meta update SUCCESS via top-level fields`);
              } else {
                console.error(`[create-and-replace-dlp] WARNING: Could not set _dlp_attached_file_id=${mediaId} on document ${newDocumentId}. Meta fields may not be registered with show_in_rest.`);
              }
            }
          } catch (metaErr) {
            console.error(`[create-and-replace-dlp] Meta update error:`, metaErr);
          }
        }

        // Trash the old document (use DELETE method since status:'trash' is not in allowed enum)
        let trashedOld = false;
        try {
          console.log(`[create-and-replace-dlp] Trashing old document ${documentId}...`);
          const trashResponse = await wpFetch(
            `${baseUrl3}/wp-json/wp/v2/dlp_document/${documentId}`,
            username,
            cleanPassword,
            { method: 'DELETE' }
          );
          if (trashResponse.ok) {
            trashedOld = true;
            console.log(`[create-and-replace-dlp] Old document ${documentId} trashed successfully`);
          } else {
            const trashErr = await trashResponse.text();
            console.error(`[create-and-replace-dlp] Failed to trash old document ${documentId}:`, trashResponse.status, trashErr);
          }
        } catch (trashError) {
          console.error(`[create-and-replace-dlp] Error trashing old document ${documentId}:`, trashError);
        }

        return new Response(JSON.stringify({
          success: true,
          newDocumentId,
          oldDocumentId: documentId,
          trashedOld,
          metaUpdateSuccess,
          categoryIds: catResult.ids,
          tagIds: tagResult.ids,
          resolvedCategories: catResult.resolved,
          resolvedTags: tagResult.resolved,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('[create-and-replace-dlp] error:', error);
        return new Response(
          JSON.stringify({ error: 'Create and replace failed', details: (error as Error).message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle legacy upload-and-update-dlp action (kept for backward compatibility)
    if (action === 'upload-and-update-dlp') {
      const { documentId, fileData, fileName, fileType, title, excerpt, categories, tags } = body;
      if (!url || !username || !password || !documentId || !fileData || !fileName) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for upload-and-update-dlp' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl3 = url.replace(/\/$/, '');

      try {
        console.log(`Uploading file "${fileName}" to WordPress media library...`);

        const binaryStr = atob(fileData);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const formData = new FormData();
        formData.append('file', new Blob([bytes], { type: fileType || 'application/pdf' }), fileName);

        const authString2 = btoa(`${username}:${cleanPassword}`);
        const mediaResponse = await fetch(`${baseUrl3}/wp-json/wp/v2/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString2}`,
            'User-Agent': 'Supabase-Edge-Function',
          },
          body: formData,
        });

        if (!mediaResponse.ok) {
          const mediaErr = await mediaResponse.text();
          return new Response(
            JSON.stringify({ error: 'Failed to upload file to WordPress media library', details: mediaErr }),
            { status: mediaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const mediaResult = await mediaResponse.json();
        const sourceUrl = mediaResult.source_url || '';
        const pdaUrl = sourceUrl.includes('/_pda/') ? sourceUrl : sourceUrl.replace('/wp-content/uploads/', '/wp-content/uploads/_pda/');
        const urlObj2 = new URL(pdaUrl);
        const relativePdaPath = pdaUrl.replace(`${urlObj2.protocol}//${urlObj2.host}`, '');

        const resolveTermIds2 = async (names: string, taxonomy: string, createIfMissing: boolean = false): Promise<number[]> => {
          if (!names || !names.trim()) return [];
          const termNames = names.split(',').map(n => n.trim()).filter(Boolean);
          const ids: number[] = [];
          for (const name of termNames) {
            try {
              const searchName = name.includes(' > ') ? name.split(' > ').pop()!.trim() : name;
              const searchUrl = `${baseUrl3}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(searchName)}&_fields=id,name,slug`;
              const resp = await wpFetch(searchUrl, username, cleanPassword);
              if (resp.ok) {
                const results = await resp.json();
                let match = results.find((r: any) => r.name.toLowerCase() === searchName.toLowerCase());
                if (!match) {
                  const slug = searchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  match = results.find((r: any) => r.slug === slug);
                }
                if (match) {
                  ids.push(match.id);
                } else if (createIfMissing) {
                  console.log(`[upload-and-update-dlp] Creating missing term "${searchName}" in ${taxonomy}`);
                  const createResp = await wpFetch(`${baseUrl3}/wp-json/wp/v2/${taxonomy}`, username, cleanPassword, {
                    method: 'POST',
                    body: JSON.stringify({ name: searchName }),
                  });
                  if (createResp.ok) {
                    const created = await createResp.json();
                    ids.push(created.id);
                    console.log(`[upload-and-update-dlp] Created "${searchName}" → ID ${created.id}`);
                  }
                }
              }
            } catch (e) {
              console.error(`Failed to resolve term "${name}" in ${taxonomy}:`, e);
            }
          }
          return ids;
        };

        const dateTag2 = new Date().toISOString().split('T')[0];
        const tagsWithDate2 = tags ? `${tags}, ${dateTag2}` : dateTag2;
        const categoryIds = await resolveTermIds2(categories || '', 'doc_categories');
        const tagIds = await resolveTermIds2(tagsWithDate2, 'doc_tags', true);

        const updateBody: Record<string, any> = {
          title: title || '',
          excerpt: excerpt || '',
        };
        if (categoryIds.length > 0) updateBody.doc_categories = categoryIds;
        if (tagIds.length > 0) updateBody.doc_tags = tagIds;
        updateBody.meta = {
          _dlp_attached_file_id: mediaResult.id,
          _dlp_document_link_type: 'file',
        };

        const updateResponse = await wpFetch(
          `${baseUrl3}/wp-json/wp/v2/dlp_document/${documentId}`,
          username,
          cleanPassword,
          { method: 'POST', body: JSON.stringify(updateBody) }
        );

        if (!updateResponse.ok) {
          const updateErr = await updateResponse.text();
          return new Response(
            JSON.stringify({ error: 'Failed to update DLP document', details: updateErr }),
            { status: updateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateResult = await updateResponse.json();

        return new Response(JSON.stringify({
          success: true,
          mediaId: mediaResult.id,
          sourceUrl,
          pdaUrl,
          relativePdaPath,
          documentId: updateResult.id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Upload-and-update-dlp error:', error);
        return new Response(
          JSON.stringify({ error: 'Upload and update failed', details: (error as Error).message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
      const taxFields = fields && fields.length > 0 ? fields : 'id,name,slug,parent,count,description';
      wordpressUrl = `${baseUrl}/wp-json/wp/v2/${taxonomySlug}?per_page=${per_page}&_fields=${taxFields}`;
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