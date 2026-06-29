/**
 * Intentional haptics. A small, named vocabulary so taps feel designed rather
 * than sprinkled. All calls are fire-and-forget and silently no-op on web.
 */

import * as Haptics from 'expo-haptics';

export const haptic = {
  /** A light tick for selection / toggles. */
  select: () => Haptics.selectionAsync(),
  /** Soft confirmation for a tap. */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** A firmer press for primary actions. */
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** Heavy thud for weighty, irreversible moments. */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  /**
   * The completion "surge" — a choreographed burst of impacts that ramps up,
   * pairing with the Achievement Canvas confetti.
   */
  surge: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 90);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      340,
    );
  },
};
