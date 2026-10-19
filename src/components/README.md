# Interface component index

[Application structure](../README.md) · [Helper index](../lib/README.md) ·
[Feature reading paths](../../docs/FEATURE_READING_PATHS.md)

A component describes a visible or interactive part of the website. Start with
the page that uses it, then follow its imports into processing helpers. A display
component is not necessarily the place where source data is generated or saved.

## Homepage preparation and branding

| Component | Responsibility |
| --- | --- |
| [`EducationHomepage.tsx`](EducationHomepage.tsx) | Main educational homepage content. |
| [`WorkspacePreview.tsx`](WorkspacePreview.tsx) | Illustrative workspace preview using example educational topics. |
| [`LessonPreparation.tsx`](LessonPreparation.tsx) | Lesson preparation progress display and topic-themed visuals. |
| [`LessonCover.tsx`](LessonCover.tsx) | Lesson cover presentation. |
| [`EduPlanMark.tsx`](EduPlanMark.tsx) | EduPlan brand mark. |
| [`CreatorCredit.tsx`](CreatorCredit.tsx) | Creator attribution display. |

## Notes presentation and subject content

| Component | Responsibility |
| --- | --- |
| [`GuidedLessonNotes.tsx`](GuidedLessonNotes.tsx) | Guided lesson note display. |
| [`GuidedNotesPresentation.tsx`](GuidedNotesPresentation.tsx) | Presentation view of guided notes. |
| [`LessonNotesPlanner.tsx`](LessonNotesPlanner.tsx) | Lesson note planning interface. |
| [`PagedNoteSections.tsx`](PagedNoteSections.tsx) | Displays paginated note sections. |
| [`MathText.tsx`](MathText.tsx) | Displays prose with mathematical notation. |
| [`MathematicsProse.tsx`](MathematicsProse.tsx) | Mathematics-specific prose rendering. |
| [`MathematicsTopicVisual.tsx`](MathematicsTopicVisual.tsx) | Mathematics topic visual presentation. |
| [`ChemistrySourceEntry.tsx`](ChemistrySourceEntry.tsx) | Displays Chemistry source entries. |
| [`FormulaDerivation.tsx`](FormulaDerivation.tsx) | Formula and derivation presentation. |
| [`FormulaMindMap.tsx`](FormulaMindMap.tsx) | Formula mind-map display. |
| [`FormulaVisualCards.tsx`](FormulaVisualCards.tsx) | Displays formula visual cards. |
| [`TopicVisualStructures.tsx`](TopicVisualStructures.tsx) | Subject/topic visual structure presentation. |
| [`SocialScienceResources.tsx`](SocialScienceResources.tsx) | Social Science resource display. |

## Source pages images and manual editing

| Component | Responsibility |
| --- | --- |
| [`BookPreparation.tsx`](BookPreparation.tsx) | Book preparation progress and controls. |
| [`BookReferenceFigures.tsx`](BookReferenceFigures.tsx) | Matched source figures and their captions. |
| [`BookMapSlide.tsx`](BookMapSlide.tsx) | Displays a source map with its source caption. |
| [`ManualVisualEditor.tsx`](ManualVisualEditor.tsx) | Manual image selection and import interface. |
| [`ManualBookPdfViewer.tsx`](ManualBookPdfViewer.tsx) | PDF page display, navigation, scrolling, and page-image import. |
| [`ManualImageCropper.tsx`](ManualImageCropper.tsx) | Crops a selected manual image. |
| [`DiagramImagePicker.tsx`](DiagramImagePicker.tsx) | Diagram image selection interface. |
| [`NcertManualLinks.tsx`](NcertManualLinks.tsx) | Relevant NCERT manual links. |
| [`PenPaperEditor.tsx`](PenPaperEditor.tsx) | Handwritten pen-note editing interface. |

## Review reports and layout checks

| Component | Responsibility |
| --- | --- |
| [`NotesContentCheck.tsx`](NotesContentCheck.tsx) | Displays the separate source-check report and review flags. |
| [`SlideLayoutCheck.tsx`](SlideLayoutCheck.tsx) | Slide-space check controls and results. |
| [`SourceIndexReview.tsx`](SourceIndexReview.tsx) | Review section for original term-and-page index entries. |

These checks have different scopes. A layout pass is not factual verification,
and a wording match is not proof that a statement is scientifically correct.
Read the relevant report's explanation and tests before changing its behaviour.

## Library access and management

| Component | Responsibility |
| --- | --- |
| [`LibraryAccessGate.tsx`](LibraryAccessGate.tsx) | Library sign-in/access interface for the existing authorised workflow. |
| [`LibraryAdminDashboard.tsx`](LibraryAdminDashboard.tsx) | Authorised library management controls. |

Keep public learning tasks separate from restricted source-management actions.
The access decision is not determined solely by whether a sign-in button is
visible; read the server access helpers as well.

## Experiments simulations and interactive views

| Component | Responsibility |
| --- | --- |
| [`ExperimentLab.tsx`](ExperimentLab.tsx) | Educational experiment interface. |
| [`ExperimentVideos.tsx`](ExperimentVideos.tsx) | Experiment video presentation. |
| [`SimulationViewer.tsx`](SimulationViewer.tsx) | Displays selected simulation resources. |
| [`SimulationOverrideEditor.tsx`](SimulationOverrideEditor.tsx) | Per-slide simulation selection overrides. |
| [`ThreeDViewer.tsx`](ThreeDViewer.tsx) | Displays the configured 3D scene. |
| [`ReactFlowDiagram.tsx`](ReactFlowDiagram.tsx) | Displays a flow graph using React Flow. |

## Shared UI primitives

The [`UI control index`](ui/README.md) describes common controls such as buttons, inputs, dialogs, tables,
tabs, menus, cards, and tooltips. These are building blocks reused by the feature
components above. Their conventional filenames support the existing component
tooling; they are not good candidates for cosmetic renaming.

For the component tooling settings, read `components.json` at the repository
root. Preserve keyboard, focus, label, and accessibility behaviour when making
future UI changes. This organisation update changes no component implementation.
