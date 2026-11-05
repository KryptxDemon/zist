import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Text } from "./Text";
import { Button } from "./Button";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** `sheet` slides up from the bottom, `dialog` is a centered card. */
  presentation?: "sheet" | "dialog";
  scrollable?: boolean;
  maxHeightRatio?: number;
}

/**
 * Modal surface used for every overlay in the app (dialogs, bottom sheets and
 * the mobile replacements for the web's dropdown menus).
 */
export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  presentation = "sheet",
  scrollable = true,
  maxHeightRatio = 0.85,
}: SheetProps) {
  const { colors, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const isSheet = presentation === "sheet";

  const body = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ gap: 12 }}>{children}</View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={onClose} />
        <View
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: isSheet ? "flex-end" : "center", padding: isSheet ? 0 : 20 }}
        >
          <View
            style={[
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderTopLeftRadius: radius["2xl"],
                borderTopRightRadius: radius["2xl"],
                borderBottomLeftRadius: isSheet ? 0 : radius["2xl"],
                borderBottomRightRadius: isSheet ? 0 : radius["2xl"],
                padding: 20,
                paddingBottom: isSheet ? insets.bottom + 20 : 20,
                gap: 14,
                maxHeight: maxHeightRatio * windowHeight,
              },
              shadow("lg"),
            ]}
          >
            {isSheet ? (
              <View
                style={{
                  alignSelf: "center",
                  height: 4,
                  width: 44,
                  borderRadius: 2,
                  backgroundColor: colors.border,
                  marginTop: -8,
                }}
              />
            ) : null}

            {title || description ? (
              <View style={{ gap: 4 }}>
                {title ? (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Text variant="h3" style={{ flex: 1 }}>
                      {title}
                    </Text>
                    <Pressable onPress={onClose} hitSlop={10}>
                      <X size={20} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                ) : null}
                {description ? <Text variant="muted">{description}</Text> : null}
              </View>
            ) : null}

            {body}
            {footer ? <View style={{ gap: 8 }}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      presentation="dialog"
      title={title}
      description={description}
      scrollable={false}
      footer={
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <Button variant="outline" label={cancelLabel} onPress={onCancel} style={{ flex: 1 }} />
          <Button
            variant={destructive ? "destructive" : "default"}
            label={confirmLabel}
            onPress={onConfirm}
            style={{ flex: 1 }}
          />
        </View>
      }
    />
  );
}

export interface MenuAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Bottom-sheet replacement for the web's `DropdownMenu`. Used for the user
 * menu, card overflow menus, and post actions.
 */
export function ActionSheet({
  visible,
  onClose,
  title,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: MenuAction[];
}) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={onClose} />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 12, paddingBottom: insets.bottom + 12, gap: 8 }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius["2xl"],
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          {title ? (
            <View style={{ padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
              <Text variant="label" weight="semibold" align="center">
                {title}
              </Text>
            </View>
          ) : null}
          {actions.map((action, index) => (
            <Pressable
              key={`${action.label}-${index}`}
              disabled={action.disabled}
              onPress={() => {
                onClose();
                // Let the sheet close before the action mutates state/navigation.
                setTimeout(action.onPress, 60);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 16,
                paddingHorizontal: 20,
                backgroundColor: pressed ? colors.accent : "transparent",
                opacity: action.disabled ? 0.4 : 1,
                borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.border,
              })}
            >
              {action.icon}
              <Text
                variant="body"
                tint={action.destructive ? colors.destructive : colors.foreground}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

/** Card-like container used inside sheets. */
export function SheetSection({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ gap: 8 }, style]}>{children}</View>;
}
