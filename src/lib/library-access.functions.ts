import {createServerFn} from "@tanstack/react-start";
export const getLibraryAccess=createServerFn({method:"POST"}).handler(async()=>{
 const {readLibraryIdentity}=await import("@/lib/library-access.server");
 const identity=await readLibraryIdentity();
 return identity?{signedIn:true,admin:identity.admin,email:identity.email,name:identity.name}:{signedIn:false,admin:false,email:"",name:""};
});
