import {beforeEach,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const mocks=vi.hoisted(()=>({identity:vi.fn(),from:vi.fn(),admin:{name:'requireLibraryAdmin'}}));
vi.mock('@/lib/library-access.server',()=>({readLibraryIdentity:mocks.identity}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{from:mocks.from}}));
vi.mock('@/lib/library-auth',()=>({requireLibraryAdmin:mocks.admin}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
 let validate=(data:unknown)=>data;let middleware:unknown[]=[];
 const builder={middleware:(value:unknown[])=>{middleware=value;return builder;},inputValidator:(value:typeof validate)=>{validate=value;return builder;},handler:(handler:Function)=>Object.assign((input:{data:unknown})=>handler({data:validate(input.data)}),{middleware})};return builder;
}}));
import {submitBookRequest,listBookRequests,reviewBookRequest} from '@/lib/book-requests.functions';
import {bookRequestError} from '@/lib/book-request-errors';
beforeEach(()=>{mocks.identity.mockReset();mocks.from.mockReset();});
const first={id:'user-one',email:'one@example.com'},second={id:'user-two',email:'two@example.com'};
const receipt={id:'00000000-0000-4000-8000-000000000001',created_at:'2026-10-21T12:00:00Z'};
it('stores requests from two verified accounts with separate identities and receipts',async()=>{
 const inserts:unknown[]=[];
 mocks.identity.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
 mocks.from.mockImplementation(()=>({select:()=>({eq:()=>({gte:async()=>({count:0,error:null})})}),insert:(row:unknown)=>{inserts.push(row);return {select:()=>({single:async()=>({data:receipt,error:null})})};}}));
 for(const name of ['First teacher','Second teacher'])expect((await submitBookRequest({data:{name,bookTitle:'NCERT Science',message:'Please add this school textbook.'}})).saved).toBe(true);
 expect(inserts).toEqual([expect.objectContaining({user_id:first.id,verified_email:first.email}),expect.objectContaining({user_id:second.id,verified_email:second.email})]);
});
it('does not return a saved receipt when the request table is absent',async()=>{
 mocks.identity.mockResolvedValue(first);
 const insert=vi.fn();mocks.from.mockReturnValue({select:()=>({eq:()=>({gte:async()=>({count:null,error:{code:'PGRST205'}})})}),insert});
 await expect(submitBookRequest({data:{name:'Teacher',bookTitle:'NCERT Science',message:'Please add this school textbook.'}})).rejects.toThrow('was not saved');
 expect(insert).not.toHaveBeenCalled();
});
it('lists requests from both accounts in the administrator view',async()=>{
 const rows=[{...receipt,requester_name:'First teacher',verified_email:first.email,message:'Book title: Science\n\nPlease add this textbook.',status:'new'},{...receipt,id:'00000000-0000-4000-8000-000000000002',requester_name:'Second teacher',verified_email:second.email,message:'Book title: Physics\n\nPlease add this textbook.',status:'new'}];
 const order=vi.fn(),range=vi.fn().mockResolvedValue({data:rows,count:2,error:null});order.mockReturnValue({order,range});
 mocks.from.mockReturnValue({select:()=>({order})});
 const result=await listBookRequests({data:{page:0}});
 expect(result.total).toBe(2);expect(result.requests.map(row=>row.book_title)).toEqual(['Science','Physics']);
 expect(range).toHaveBeenCalledWith(0,24);
 expect((listBookRequests as unknown as {middleware:unknown[]}).middleware).toContain(mocks.admin);
 expect((reviewBookRequest as unknown as {middleware:unknown[]}).middleware).toContain(mocks.admin);
});
it('distinguishes missing storage from access and temporary failures',()=>{
 expect(bookRequestError({code:'42P01'},'list')).toContain('storage is unavailable');
 expect(bookRequestError({code:'42501'},'list')).toContain('permissions');
 expect(bookRequestError({code:'NETWORK'},'list')).not.toContain('storage is unavailable');
});
it('provides an idempotent private repair migration without deleting existing data',()=>{
 const sql=readFileSync('drizzle/migrations/0004_repair_private_book_requests.sql','utf8');
 expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.book_requests');
 expect(sql).toContain('ENABLE ROW LEVEL SECURITY');expect(sql).toContain('FROM PUBLIC, anon, authenticated');
 expect(sql).toContain('TO service_role');expect(sql).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
 expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
 expect(readFileSync('supabase/migrations/20261021040000_repair_private_book_requests.sql','utf8')).toBe(sql);
});
