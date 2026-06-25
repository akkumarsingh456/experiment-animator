
CREATE POLICY "ncert pdfs readable" ON storage.objects FOR SELECT USING (bucket_id = 'ncert-pdfs');
CREATE POLICY "ncert pdfs writable" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ncert-pdfs');
CREATE POLICY "ncert pdfs updatable" ON storage.objects FOR UPDATE USING (bucket_id = 'ncert-pdfs') WITH CHECK (bucket_id = 'ncert-pdfs');
CREATE POLICY "ncert pdfs deletable" ON storage.objects FOR DELETE USING (bucket_id = 'ncert-pdfs');
