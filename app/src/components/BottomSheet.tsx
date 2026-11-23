import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo, Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, MIN_TOUCH, radius, shadowStyle, space } from "../theme";

const OPEN_MS = 200; // design system: 200ms ease-out for sheets
const HALF = 0.5; // opens to half the screen
const FULL = 0.9; // drags to nearly full
const DRAG_THRESHOLD = 60;

/** Design-system bottom sheet: opens to half height, drags to full, swipe down or tap the scrim to close. */
export function BottomSheet({ visible, onClose, closeLabel, expandLabel, children, testID }: {
  visible: boolean; onClose: () => void; closeLabel: string; expandLabel: string; children: ReactNode; testID?: string;
}) {
  const { height: screen } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const full = screen * FULL;
  const hiddenY = full; // fully below the screen
  const halfY = full - screen * HALF;
  const y = useRef(new Animated.Value(hiddenY)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  const animateTo = (toY: number, opacity: number, done?: () => void) => {
    const easing = Easing.out(Easing.quad);
    if (reduceMotion) y.setValue(toY); // reduce motion: fade only, no slide
    Animated.parallel([
      ...(reduceMotion ? [] : [Animated.timing(y, { toValue: toY, duration: OPEN_MS, easing, useNativeDriver: true })]),
      Animated.timing(fade, { toValue: opacity, duration: OPEN_MS, easing, useNativeDriver: true }),
    ]).start(() => done?.());
  };

  useEffect(() => {
    if (visible) {
      setExpanded(false);
      animateTo(halfY, 1);
    }
  }, [visible, halfY]);

  const close = () => animateTo(hiddenY, 0, onClose);

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
    onPanResponderRelease: (_, g) => {
      if (g.dy > DRAG_THRESHOLD) {
        if (expandedRef.current) {
          setExpanded(false);
          animateTo(halfY, 1);
        } else close();
      } else if (g.dy < -DRAG_THRESHOLD) {
        setExpanded(true);
        animateTo(0, 1);
      }
    },
  })).current;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Pressable testID="sheet-scrim" accessibilityRole="button" accessibilityLabel={closeLabel} onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
      </Animated.View>
      <Animated.View testID={testID} accessibilityViewIsModal
        style={[styles.sheet, shadowStyle("sheet"), { height: full, opacity: fade, transform: [{ translateY: y }] }]}>
        {/* Drag the handle, or tap it (works without touch gestures too), to switch half and full height. */}
        <Pressable {...pan.panHandlers} testID="sheet-handle" accessibilityRole="button" accessibilityLabel={expandLabel}
          accessibilityState={{ expanded }} style={styles.handleArea}
          onPress={() => {
            const next = !expandedRef.current;
            setExpanded(next);
            animateTo(next ? 0 : halfY, 1);
          }}>
          <View style={styles.handle} />
        </Pressable>
        {/* Visible height minus the handle and the phone's bottom inset, so the end can always be scrolled into view. */}
        <View style={{ height: (expanded ? full : screen * HALF) - MIN_TOUCH - insets.bottom, marginBottom: insets.bottom }}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  handleArea: { alignItems: "center", justifyContent: "center", minHeight: MIN_TOUCH },
  handle: { width: space[8], height: space[1], borderRadius: radius.pill, backgroundColor: colors.border },
});
