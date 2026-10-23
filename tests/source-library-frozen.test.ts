import {readFileSync} from 'node:fs';
import {it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({request:vi.fn(),user:vi.fn()}));
vi.mock('@tanstack/react-start/server',()=>({getRequest:mocks.request,setResponseHeader:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{getUser:mocks.user}})}));
import {readLibraryIdentity,assertLibraryAdmin} from '@/lib/library-access.server';
it('denies source management without authentication',async()=>{
 mocks.request.mockReturnValue(new Request('https://example.test/upload'));
 expect(await readLibraryIdentity()).toBeNull();
 await expect(assertLibraryAdmin()).rejects.toThrow('read-only');
});
it.each(['akkumarsingh456@gmail.com','ak25edi00022@student.nitw.ac.in','teacher@example.test'])('keeps private identity but grants no book management to %s',async email=>{
 mocks.request.mockReturnValue(new Request('https://example.test/upload',{headers:{authorization:'Bearer old-session',origin:'https://example.test'}}));
 mocks.user.mockResolvedValue({data:{user:{id:'teacher-id',email,email_confirmed_at:'2026-10-24',user_metadata:{}}},error:null});
 expect(await readLibraryIdentity()).toMatchObject({id:'teacher-id',email,admin:false});
 await expect(assertLibraryAdmin()).rejects.toThrow('disabled for everyone');
});

it('ships matching database and storage freezes in both deployment chains without deleting files',()=>{
 const sql=readFileSync('drizzle/migrations/0005_freeze_source_library.sql','utf8');
 expect(sql.replace(/\r\n/g,'\n')).toBe(readFileSync('supabase/migrations/20261024010000_freeze_source_library.sql','utf8').replace(/\r\n/g,'\n'));
 expect(sql).toContain("ARRAY['ncert_books','ncert_pages','ncert_chunks']");
 expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE');
 expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE');
 expect(sql).toContain("OLD.bucket_id = 'ncert-pdfs'");expect(sql).toContain("NEW.bucket_id = 'ncert-pdfs'");
 expect(sql).not.toMatch(/(?:DELETE FROM|TRUNCATE TABLE)\s+(?:public\.)?ncert_/i);
 const journal=JSON.parse(readFileSync('drizzle/migrations/meta/_journal.json','utf8'));
 expect(journal.entries.at(-1).tag).toBe('0005_freeze_source_library');
});
