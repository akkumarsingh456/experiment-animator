import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

const Spline = lazy(() => import("@splinetool/react-spline"));

export function ThreeDViewer({ sceneUrl, className }: { sceneUrl: string; className?: string }) {
  if (!sceneUrl) return null;
  return (
    <div className={`relative w-full h-full overflow-hidden rounded-md bg-black/5 ${className ?? ""}`}>
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground gap-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading 3D…
          </div>
        }
      >
        <Spline scene={sceneUrl} style={{ width: "100%", height: "100%" }} />
      </Suspense>
    </div>
  );
}
