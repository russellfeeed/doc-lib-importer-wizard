import { supabase } from "@/integrations/supabase/client";
import { getWordPressCredentials } from "./wordpressUtils";

export interface DocCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  description?: string;
}

export interface DlpDocSummary {
  id: number;
  title: string;
  link: string;
  status: string;
  mediaId: number;
  fileUrl: string;
  mimeType: string;
  resolvedFrom?: string;
}

export interface UrlCheckResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  contentLength: number;
  isPdf: boolean;
  isHtml: boolean;
  redirectedToHtm: boolean;
  error?: string;
  magic?: string;
  loginBlocked?: boolean;
  authMode?: "none" | "basic" | "cookie";
}

export const fetchDocCategories = async (): Promise<DocCategory[]> => {
  const creds = getWordPressCredentials();
  if (!creds) throw new Error("WordPress credentials not configured");

  const { data, error } = await supabase.functions.invoke("wordpress-proxy", {
    body: {
      url: creds.url,
      username: creds.username,
      password: creds.password,
      action: "fetch-taxonomy",
      taxonomySlug: "doc_categories",
      per_page: 100,
      fields: "id,name,slug,parent,count,description",
    },
  });

  if (error) throw new Error(error.message || "Failed to fetch doc_categories");
  return Array.isArray(data) ? data : [];
};

export const fetchDlpByCategory = async (categoryId: number): Promise<DlpDocSummary[]> => {
  const creds = getWordPressCredentials();
  if (!creds) throw new Error("WordPress credentials not configured");

  const { data, error } = await supabase.functions.invoke("wordpress-proxy", {
    body: {
      url: creds.url,
      username: creds.username,
      password: creds.password,
      action: "fetch-dlp-by-category",
      categoryId,
    },
  });

  if (error) throw new Error(error.message || "Failed to fetch DLP documents");
  return data?.documents || [];
};

export const checkDocumentUrl = async (checkUrl: string): Promise<UrlCheckResult> => {
  const creds = getWordPressCredentials();
  if (!creds) throw new Error("WordPress credentials not configured");

  const { data, error } = await supabase.functions.invoke("wordpress-proxy", {
    body: {
      url: creds.url,
      username: creds.username,
      password: creds.password,
      action: "check-document-url",
      checkUrl,
    },
  });

  if (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: checkUrl,
      contentType: "",
      contentLength: 0,
      isPdf: false,
      isHtml: false,
      redirectedToHtm: false,
      error: error.message || "URL check failed",
    };
  }
  return data as UrlCheckResult;
};

export const classifyIssue = (
  r: UrlCheckResult,
  hasUrl: boolean
): { label: string; severity: "ok" | "warn" | "error" | "protected" } => {
  if (!hasUrl) return { label: "No file URL", severity: "error" };
  if (r.error) return { label: r.error === "timeout" ? "Timeout" : `Network error: ${r.error}`, severity: "error" };
  if (r.ok) return { label: "OK", severity: "ok" };
  if (r.loginBlocked) return { label: "Protected (WP login required)", severity: "protected" };
  if (r.redirectedToHtm) return { label: `Redirected to .htm (${r.finalUrl})`, severity: "error" };
  if (r.isHtml) return { label: "HTML page (not a PDF)", severity: "error" };
  if (r.status >= 400) return { label: `HTTP ${r.status}`, severity: "error" };
  if (r.status === 0) return { label: "No response", severity: "error" };
  return { label: `Unexpected (${r.status} ${r.contentType || "?"})`, severity: "warn" };
};
export const fetchDlpRaw = async (documentId: number): Promise<any> => {
  const creds = getWordPressCredentials();
  if (!creds) throw new Error("WordPress credentials not configured");

  const { data, error } = await supabase.functions.invoke("wordpress-proxy", {
    body: {
      url: creds.url,
      username: creds.username,
      password: creds.password,
      action: "fetch-dlp-raw",
      documentId,
    },
  });

  if (error) throw new Error(error.message || "Failed to fetch raw DLP document");
  return data;
};

export interface MediaCandidate {
  id: number;
  title: string;
  sourceUrl: string;
  mimeType: string;
  date: string;
}

export const searchWordPressMedia = async (
  searchTerm: string,
  mimeType?: string,
): Promise<MediaCandidate[]> => {
  const creds = getWordPressCredentials();
  if (!creds) throw new Error("WordPress credentials not configured");

  const { data, error } = await supabase.functions.invoke("wordpress-proxy", {
    body: {
      url: creds.url,
      username: creds.username,
      password: creds.password,
      action: "search-media",
      searchTerm,
      mimeType,
      perPage: 15,
    },
  });

  if (error) throw new Error(error.message || "Media search failed");
  return (data?.results || []) as MediaCandidate[];
};
