import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a file to Supabase storage and returns the public URL
 */
export const uploadFileToStorage = async (file: File, fileName: string): Promise<string> => {
  try {
    // Create a unique filename to avoid conflicts
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${timestamp}-${fileName}.${fileExtension}`;
    
    // Upload file to storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(uniqueFileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
};

/**
 * Deletes a file from Supabase storage
 */
export const deleteFileFromStorage = async (fileUrl: string): Promise<void> => {
  try {
    // Extract filename from URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    const { error } = await supabase.storage
      .from('documents')
      .remove([fileName]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw error;
  }
};