import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";
import { Text } from "./Text";

export interface ToastInput {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

interface ToastRecord extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id?: number) => {
    setToasts((prev) => (id == null ? [] : prev.filter((t) => t.id !== id)));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((prev) => [...prev.slice(-2), { ...input, id }]);
      const duration = input.duration ?? 3600;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id?: number) => void;
}) {
  const { colors, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}>
      <View style={{ padding: 16, paddingBottom: insets.bottom + 90, gap: 8 }} pointerEvents="box-none">
        {toasts.map((item) => {
          const accent =
            item.variant === "destructive"
              ? colors.destructive
              : item.variant === "success"
                ? "#16a34a"
                : colors.primary;
          return (
            <Pressable
              key={item.id}
              onPress={() => onDismiss(item.id)}
              style={[
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderLeftWidth: 4,
                  borderColor: colors.border,
                  borderLeftColor: accent,
                  padding: 14,
                  gap: 4,
                },
                shadow("md"),
              ]}
            >
              {item.title ? (
                <Text variant="label" weight="semibold">
                  {item.title}
                </Text>
              ) : null}
              {item.description ? <Text variant="small">{item.description}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/** Animated fade+rise wrapper reused by overlays. */
export function useFadeIn(visible: boolean, duration = 180) {
  const progress = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration,
      useNativeDriver: true,
    }).start();
  }, [visible, duration, progress]);
  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };
}
