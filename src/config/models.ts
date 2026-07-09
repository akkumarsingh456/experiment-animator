// Local 3D model registry — maps model_category → verified Spline scene URL.
// The AI never emits raw 3D. It only picks a category; the frontend maps it here.
// Replace URLs with your own Spline scenes as you publish them.
export type ModelCategory =
  | "physics_circuit"
  | "chemistry_atom"
  | "biology_cell"
  | "math_geometry"
  | "none";

export const ModelRegistry: Record<ModelCategory, string> = {
  // Public Spline community scenes (safe defaults; replace with project-owned scenes).
  physics_circuit: "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode",
  chemistry_atom: "https://prod.spline.design/nsCJUGaS08Wf-1th/scene.splinecode",
  biology_cell: "https://prod.spline.design/US3ryndAM3ykOb01/scene.splinecode",
  math_geometry: "https://prod.spline.design/kZ1WsCBB1DzTKjZS/scene.splinecode",
  none: "",
};

export function resolveModelUrl(category: string | undefined | null): string {
  if (!category) return "";
  return ModelRegistry[category as ModelCategory] ?? "";
}
