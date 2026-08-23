// Loading использует shared Skeleton из UI-kit.
import { Panel, PanelBody, SkeletonStack } from "@/components/ui";

// Loading UI для /lessons/[id].
export default function LessonLoading() {
  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8" id="main-content" tabIndex={-1}>
      <Panel className="mx-auto max-w-7xl">
        <PanelBody>
          <SkeletonStack />
        </PanelBody>
      </Panel>
    </main>
  );
}
