import InstituteScreen from './InstituteScreen';
import { useScreenLayout } from './screenLayout';
import { resolveAssetUrl } from '../exams/examData';

// Screen 7 inside TestEngine: loads the saved layout and institute branding,
// then renders it with the engine's own state and handlers (passed as props).
export default function LiveInstituteScreen(props) {
  const { layout, branding } = useScreenLayout();
  return (
    <InstituteScreen
      layout={layout}
      branding={branding}
      logoSrc={branding.logoUrl ? resolveAssetUrl(branding.logoUrl) : null}
      {...props} />
  );
}
