import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {ncertHighlightPayloadSchema} from "./ncert-highlight-store.server";
export const loadNcertHighlights=createServerFn({method:"POST"}).inputValidator((raw:unknown)=>z.object({scope:ncertHighlightPayloadSchema.shape.scope}).strict().parse(raw)).handler(async({data})=>{
 const {loadPrivateNcertHighlights}=await import("./ncert-highlight-store.server");
 return loadPrivateNcertHighlights(data.scope);
});
export const saveNcertHighlights=createServerFn({method:"POST"}).inputValidator((raw:unknown)=>z.object({payload:ncertHighlightPayloadSchema,expectedEmail:z.string().email().max(320)}).strict().parse(raw)).handler(async({data})=>{
 const {savePrivateNcertHighlights}=await import("./ncert-highlight-store.server");
 return savePrivateNcertHighlights(data.payload,data.expectedEmail);
});
