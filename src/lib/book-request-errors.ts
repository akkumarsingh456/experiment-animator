type RequestDatabaseError={code?:string;status?:number}|null;
/** Explain the actual failure category without exposing database records or keys. */
export function bookRequestError(error:RequestDatabaseError,action:'submit'|'list'|'review'):string {
 const missing=error?.code==='PGRST205'||error?.code==='42P01';
 if(missing)return action==='submit'
  ?'Your request was not saved because book request storage is not set up yet. Ask the administrator to finish the database setup, then submit again. Your details remain in this form.'
  :'Book request storage is unavailable in the connected database API. Apply the pending book-request database update in Lovable, then refresh. Publishing the website alone does not create the table or refresh its schema.';
 if(error?.code==='42501'||error?.status===401||error?.status===403)return action==='submit'
  ?'Your request was not saved because the server could not access book request storage. Please contact the administrator and try again after access is restored.'
  :'The server cannot access book requests. Check the server database connection and permissions, then refresh.';
 return action==='submit'?'Your request could not be saved. Please retry; your details remain in this form.':action==='review'?'The request could not be updated. Please retry.':'Book requests could not be loaded. Please retry. If this continues, check the server database connection.';
}
