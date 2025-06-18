// hooks/useAnalytics.ts
import { useCallback } from 'react';
import { Analytics } from '@/utils/analytics';
import { useLocation } from '@/contexts/LocationContext';

export function useAnalytics() {
  const { location } = useLocation();

  const trackSouffleCreated = useCallback(() => {
    Analytics.trackEvent({
      type: 'souffle_created',
      data: {},
      location: location || undefined,
    });
  }, [location]);

  const trackSouffleRevealed = useCallback(() => {
    Analytics.trackEvent({
      type: 'souffle_revealed',
      data: {},
      location: location || undefined,
    });
  }, [location]);

  return { trackSouffleCreated, trackSouffleRevealed };
}