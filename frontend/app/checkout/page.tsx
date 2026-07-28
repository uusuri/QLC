import { CheckoutClient } from "@/components/CheckoutClient";
import { getCourseCatalog, getPaymentMethods } from "@/services/api";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  searchParams?: Promise<{ course?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const [courses, paymentMethods] = await Promise.all([getCourseCatalog(), getPaymentMethods()]);

  return (
    <CheckoutClient
      courses={courses}
      paymentMethods={paymentMethods}
      requestedCourseSlug={params?.course}
    />
  );
}
