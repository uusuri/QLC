// SkeletonStack показывает loading state, пока Next грузит route data.
import { Panel, PanelBody, SkeletonStack } from "@/components/ui";

// Loading UI для /courses/[slug].
export default function CourseLoading() {
  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <Panel className="mx-auto max-w-7xl">
        <PanelBody>
          <SkeletonStack />
        </PanelBody>
      </Panel>
    </main>
  );
}
