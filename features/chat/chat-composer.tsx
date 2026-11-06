import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  MotionPressable as Pressable,
  MotionTouchableOpacity as TouchableOpacity,
} from "@/components/motion";
import { SUGGESTIONS } from "@/features/chat/preview-model";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import {
  createEditorialPalette,
  createEditorialStyles,
} from "@/theme/editorial-theme";
import { Type } from "@/theme/typography";

const Palette = createEditorialPalette();

type ChatComposerProps = {
  inputText: string;
  onChangeText: (text: string) => void;
  isTyping: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
  onNotify: (notification: { message: string; status: "error" }) => void;
};

export function ChatComposer({
  inputText,
  onChangeText,
  isTyping,
  canSend,
  onSend,
  onStop,
  onNotify,
}: ChatComposerProps) {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const [composerPanel, setComposerPanel] = useState<
    "suggestions" | "photos" | null
  >(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [inputHeight, setInputHeight] = useState(32);
  const inputRef = useRef<TextInput>(null);

  const handlePickPhoto = async (source: "camera" | "library") => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      // Open the web picker directly inside the tap so browsers retain the user gesture.
      if (Platform.OS !== "web") {
        const permission =
          source === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          const label = source === "camera" ? "camera" : "photo library";
          Alert.alert(
            "Photo access needed",
            `Allow ${label} access to preview a photo in chat.`,
            [
              { text: "Not now", style: "cancel" },
              ...(!permission.canAskAgain
                ? [
                    {
                      text: "Open settings",
                      onPress: () => {
                        void Linking.openSettings().catch(() => undefined);
                      },
                    },
                  ]
                : []),
            ],
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        cameraType: ImagePicker.CameraType.back,
        quality: 0.8,
        allowsEditing: false,
      };
      const result = await (source === "camera"
        ? ImagePicker.launchCameraAsync(options)
        : ImagePicker.launchImageLibraryAsync(options));
      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0]);
        setComposerPanel(null);
      }
    } catch {
      onNotify({
        message:
          source === "camera"
            ? "Camera unavailable. Try choosing a photo."
            : "Couldn’t open photos. Please try again.",
        status: "error",
      });
    } finally {
      setPhotoBusy(false);
    }
  };
  return (
    <>
      {composerPanel && (
        <View style={styles.composerPanel}>
          <View style={styles.composerPanelHeader}>
            <Text style={styles.composerPanelTitle}>
              {composerPanel === "suggestions"
                ? "A little inspiration"
                : "Add a photo"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close composer options"
              hitSlop={8}
              onPress={() => setComposerPanel(null)}
              style={styles.panelClose}
            >
              <Ionicons name="close" size={18} color={Palette.secondary} />
            </Pressable>
          </View>
          {composerPanel === "suggestions" ? (
            SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion.label}
                accessibilityRole="button"
                accessibilityLabel={suggestion.label}
                onPress={() => {
                  onChangeText(suggestion.value);
                  setComposerPanel(null);
                  inputRef.current?.focus();
                }}
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.suggestionText}>{suggestion.label}</Text>
                <Ionicons name="arrow-forward" size={16} color={Palette.red} />
              </Pressable>
            ))
          ) : (
            <>
              <Text style={styles.photoNote}>
                Preview a photo here. Image sending isn’t available yet.
              </Text>
              <View style={styles.photoSources}>
                {(
                  [
                    ["library", "images-outline", "Choose a photo"],
                    ["camera", "camera-outline", "Take a photo"],
                  ] as const
                ).map(([source, icon, label]) => (
                  <Pressable
                    key={source}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    disabled={photoBusy}
                    onPress={() => handlePickPhoto(source)}
                    style={({ pressed }) => [
                      styles.photoSource,
                      photoBusy && styles.pressed,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name={icon} size={22} color={Palette.red} />
                    <Text style={styles.suggestionText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              {photoBusy && (
                <ActivityIndicator
                  accessibilityLabel="Opening photos"
                  size="small"
                  color={Palette.red}
                />
              )}
            </>
          )}
        </View>
      )}

      {photo && (
        <View style={styles.photoPreview}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.photoThumbnail}
            contentFit="cover"
            accessibilityLabel="Selected photo preview"
          />
          <View style={styles.photoPreviewCopy}>
            <Text numberOfLines={1} style={styles.composerPanelTitle}>
              {photo.fileName || "Photo preview"}
            </Text>
            <Text style={styles.photoNote}>
              Preview only. Remove photo to send text.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            onPress={() => setPhoto(null)}
            style={styles.composerAction}
          >
            <Ionicons name="close" size={20} color={Palette.secondary} />
          </Pressable>
        </View>
      )}

      <View style={styles.composer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          accessibilityState={{
            expanded: composerPanel === "photos",
            disabled: photoBusy,
          }}
          disabled={photoBusy}
          onPress={() =>
            setComposerPanel((current) =>
              current === "photos" ? null : "photos",
            )
          }
          style={[
            styles.composerAction,
            composerPanel === "photos" && styles.composerActionActive,
          ]}
        >
          <Ionicons
            name="image-outline"
            size={21}
            color={composerPanel === "photos" ? Palette.red : Palette.secondary}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Magic suggestions"
          accessibilityState={{ expanded: composerPanel === "suggestions" }}
          onPress={() =>
            setComposerPanel((current) =>
              current === "suggestions" ? null : "suggestions",
            )
          }
          style={[
            styles.composerAction,
            composerPanel === "suggestions" && styles.composerActionActive,
          ]}
        >
          <Ionicons
            name="sparkles-outline"
            size={20}
            color={
              composerPanel === "suggestions" ? Palette.red : Palette.secondary
            }
          />
        </Pressable>
        <TextInput
          ref={inputRef}
          accessibilityLabel="Message NERU"
          style={[styles.textInput, { height: inputText ? inputHeight : 32 }]}
          value={inputText}
          onChangeText={onChangeText}
          placeholder="Message NERU…"
          placeholderTextColor={Palette.muted}
          multiline
          numberOfLines={1}
          onContentSizeChange={({ nativeEvent }) =>
            setInputHeight(
              Math.min(96, Math.max(32, nativeEvent.contentSize.height)),
            )
          }
          maxLength={500}
        />
        <TouchableOpacity
          accessibilityLabel={isTyping ? "Stop response" : "Send message"}
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={!isTyping && (!inputText.trim() || !canSend || !!photo)}
          onPress={isTyping ? onStop : onSend}
          style={[
            styles.sendButton,
            !isTyping &&
              (!inputText.trim() || !canSend || !!photo) &&
              styles.sendButtonDisabled,
          ]}
        >
          <Ionicons
            name={isTyping ? "stop" : "arrow-up"}
            size={21}
            color={Palette.onAccent}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const themedStyles = createEditorialStyles(() => ({
  pressed: { opacity: 0.62 },
  composerPanel: {
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 12,
    backgroundColor: Palette.card,
  },
  composerPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  composerPanelTitle: { ...Type.bodyStrong, color: Palette.ink },
  panelClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  suggestionText: { ...Type.bodySmall, color: Palette.secondary },
  photoNote: { ...Type.caption, color: Palette.muted },
  photoSources: { flexDirection: "row", gap: 8, marginTop: 12 },
  photoSource: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    backgroundColor: Palette.surface,
  },
  photoPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 10,
    backgroundColor: Palette.card,
  },
  photoThumbnail: { width: 56, height: 56, borderRadius: 6 },
  photoPreviewCopy: { flex: 1, minWidth: 0, gap: 4 },
  composer: {
    minHeight: 46,
    maxHeight: 108,
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 3,
    backgroundColor: Palette.card,
  },
  composerAction: {
    width: 36,
    height: 38,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  composerActionActive: { backgroundColor: Palette.redSoft },
  textInput: {
    ...Type.body,
    fontWeight: "400",
    flex: 1,
    minWidth: 0,
    maxHeight: 96,
    minHeight: 32,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    color: Palette.ink,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.red,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    marginRight: 2,
  },
  sendButtonDisabled: { backgroundColor: Palette.muted },
}));
