import { createMiddleware } from "@tanstack/react-start";
export const requireLibraryAdmin = createMiddleware({type:"function"}).server(async ({next}) => {
  const {assertLibraryAdmin} = await import("@/lib/library-access.server");
  const libraryUser = await assertLibraryAdmin();
  return next({context:{libraryUser}});
});
