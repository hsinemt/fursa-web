import { OnboardingWizard } from "@/components/features/onboarding/wizard";
import { pageTitle } from "@/lib/page-title";

export const generateMetadata = pageTitle("onboarding");

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
