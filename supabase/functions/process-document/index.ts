import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text extraction from PDF - looks for text streams
function extractTextFromPdfBuffer(buffer: Uint8Array): string {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(buffer);
  
  // Extract text between stream/endstream markers
  const textParts: string[] = [];
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  
  while ((match = streamRegex.exec(content)) !== null) {
    const streamContent = match[1];
    // Try to extract readable text (filter out binary garbage)
    const readable = streamContent
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (readable.length > 20) {
      textParts.push(readable);
    }
  }
  
  // Also try to find text in parentheses (PDF text objects)
  const textObjRegex = /\(([^)]+)\)/g;
  while ((match = textObjRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 2 && /[a-zA-Z]{2,}/.test(text)) {
      textParts.push(text);
    }
  }
  
  // And try BT/ET blocks (text blocks)
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    // Extract Tj and TJ operators
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }
  }
  
  let extractedText = textParts.join(' ').trim();
  
  // If we got very little text, try a more aggressive approach
  if (extractedText.length < 100) {
    // Look for any readable ASCII sequences
    const asciiRegex = /[A-Za-z][A-Za-z0-9\s.,;:!?'-]{10,}/g;
    const asciiMatches = content.match(asciiRegex) || [];
    extractedText = asciiMatches.join(' ');
  }
  
  return extractedText;
}

// Truncate content for AI processing
function truncateForAI(content: string, maxChars: number = 400000): string {
  if (content.length <= maxChars) return content;
  
  const truncated = content.substring(0, maxChars);
  const lastSentence = truncated.lastIndexOf('.');
  if (lastSentence > maxChars * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }
  return truncated;
}

// Extract standard info from filename as fallback
function extractFromFilename(fileName: string): { standardNumber: string; documentTitle: string } {
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  
  // Common patterns for standard numbers
  const patterns = [
    /^((?:BS\s*)?EN\s*\d+(?:-\d+)?(?::\d{4})?(?:\+A\d+:\d{4})?)/i,
    /^(ISO\s*\d+(?:-\d+)?(?::\d{4})?)/i,
    /^(BS\s*\d+(?:-\d+)?(?::\d{4})?)/i,
    /^(IEC\s*\d+(?:-\d+)?(?::\d{4})?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      const standardNumber = match[1].trim();
      let title = nameWithoutExt.substring(match[0].length).trim();
      title = title.replace(/^[-_\s]+/, '').trim();
      return { standardNumber, documentTitle: title || 'Untitled Standard' };
    }
  }
  
  return { standardNumber: '', documentTitle: nameWithoutExt };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName, mimeType, mediaId, apiSecret } = await req.json();
    
    console.log(`Processing document: ${fileName} (mediaId: ${mediaId})`);

    // Validate API secret
    const expectedSecret = Deno.env.get('DOCUMENT_API_SECRET');
    if (!expectedSecret || apiSecret !== expectedSecret) {
      console.error('Invalid API secret provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid API secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!fileUrl || !fileName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: fileUrl, fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only process PDFs
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Only PDF documents are supported',
          data: extractFromFilename(fileName)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the file
    console.log(`Downloading file from: ${fileUrl}`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    console.log(`Downloaded ${buffer.length} bytes`);

    // Extract text from PDF
    let extractedText = '';
    try {
      extractedText = extractTextFromPdfBuffer(buffer);
      console.log(`Extracted ${extractedText.length} characters from PDF`);
    } catch (error) {
      console.error('PDF text extraction failed:', error);
    }

    // Truncate for AI processing
    const truncatedContent = truncateForAI(extractedText);

    // Get OpenAI API key
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Process with OpenAI
    const systemPrompt = `You are an expert document analyst specializing in technical standards and specifications. 
Analyze the provided document content and extract structured information.
Return your response as valid JSON only, with no additional text or markdown.`;

    const userPrompt = `Analyze this document and extract the following information:

1. **standardNumber**: The official standard reference number (e.g., "BS EN 50131-1:2006+A3:2020", "ISO 9001:2015"). Look for patterns like BS, EN, ISO, IEC followed by numbers.

2. **documentTitle**: The descriptive title of the standard (e.g., "Alarm systems - Intrusion and hold-up systems - System requirements")

3. **excerpt**: A 2-3 sentence summary of what this standard covers and its main purpose.

4. **category**: Classify as either "Standards > System" (for building systems, alarm systems, CCTV, access control, fire, electrical, structural) or "Standards > Service" (for service delivery, maintenance, management, quality, procedures).

5. **tags**: Generate 5-10 relevant keywords/tags as an array.

Document filename: ${fileName}

Document content (may be truncated):
${truncatedContent.substring(0, 50000)}

Respond with valid JSON only in this exact format:
{
  "standardNumber": "string",
  "documentTitle": "string", 
  "excerpt": "string",
  "category": "Standards > System" or "Standards > Service",
  "tags": ["tag1", "tag2", ...]
}`;

    console.log('Calling OpenAI API...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const aiContent = openAIData.choices[0]?.message?.content || '';
    console.log('OpenAI response received');

    // Parse AI response
    let parsedData;
    try {
      // Clean up potential markdown formatting
      const cleanJson = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      // Fall back to filename extraction
      parsedData = {
        ...extractFromFilename(fileName),
        excerpt: 'Document processed but AI extraction failed.',
        category: 'Standards > System',
        tags: []
      };
    }

    // Ensure we have valid data, fallback to filename if needed
    if (!parsedData.standardNumber) {
      const fallback = extractFromFilename(fileName);
      parsedData.standardNumber = fallback.standardNumber;
      if (!parsedData.documentTitle) {
        parsedData.documentTitle = fallback.documentTitle;
      }
    }

    // Generate category slug
    const categorySlug = parsedData.category === 'Standards > Service' 
      ? 'standards-service' 
      : 'standards-system';

    const result = {
      success: true,
      data: {
        standardNumber: parsedData.standardNumber || '',
        documentTitle: parsedData.documentTitle || '',
        excerpt: parsedData.excerpt || '',
        category: parsedData.category || 'Standards > System',
        categorySlug,
        tags: Array.isArray(parsedData.tags) ? parsedData.tags : [],
        mediaId,
        processedAt: new Date().toISOString(),
      }
    };

    console.log('Document processed successfully:', result.data.standardNumber);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
