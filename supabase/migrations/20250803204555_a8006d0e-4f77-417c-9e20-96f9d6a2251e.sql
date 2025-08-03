-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Create policies for document uploads
CREATE POLICY "Anyone can view documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents');

CREATE POLICY "Anyone can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can update documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents');

CREATE POLICY "Anyone can delete documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents');