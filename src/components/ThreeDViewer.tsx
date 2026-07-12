import { Component, Suspense, lazy, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const Spline = lazy(() => import("@splinetool/react-spline"));

class SplineErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    // Swallow: Spline throws async "Data read, but end of buffer not reached"
    // when a scene URL is unreachable/invalid. We must not let this crash the
    // whole page.
    console.warn("3D scene failed to load", error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function ThreeDViewer({ sceneUrl, className }: { sceneUrl: string; className?: string }) {
  if (!sceneUrl) return null;
  const fallback = (
    <div className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground p-3 text-center">
      3D preview unavailable for this slide
    </div>
  );
  return (
    <div className={`relative w-full h-full overflow-hidden rounded-md bg-black/5 ${className ?? ""}`}>
      <SplineErrorBoundary fallback={fallback}>
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground gap-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading 3D…
            </div>
          }
        >
          <Spline
            scene={sceneUrl}
            style={{ width: "100%", height: "100%" }}
            onError={(e) => {
              console.warn("Spline onError", e);
            }}
          />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  );
}
