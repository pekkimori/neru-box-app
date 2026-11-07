import { AppBox } from '@/components/app-box';
import { ActionButton, ButtonIcon, ButtonLabel, IconButton } from '@/components/app-controls';
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
  const inputRef = useRef<import('react-native').TextInputInstance>(null);

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
        <AppBox variant="card" padding="sm" style={styles.composerPanel}>
          <View style={styles.composerPanelHeader}>
            <Text style={styles.composerPanelTitle}>
              {composerPanel === "suggestions"
                ? "A little inspiration"
                : "Add a photo"}
            </Text>
            <IconButton
              accessibilityRole="button"
              accessibilityLabel="Close composer options"
              hitSlop={8}
              onPress={() => setComposerPanel(null)}
            >
              <ButtonIcon name="close" size={18} />
            </IconButton>
          </View>
          {composerPanel === "suggestions" ? (
            SUGGESTIONS.map((suggestion) => (
              <ActionButton
                key={suggestion.label}
                accessibilityRole="button"
                accessibilityLabel={suggestion.label}
                onPress={() => {
                  onChangeText(suggestion.value);
                  setComposerPanel(null);
                  inputRef.current?.focus();
                }}
              >
                <ButtonLabel>{suggestion.label}</ButtonLabel>
                <ButtonIcon name="arrow-forward" size={16} />
              </ActionButton>
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
                  <ActionButton style={{ flex: 1 }}
                    key={source}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    disabled={photoBusy}
                    onPress={() => handlePickPhoto(source)}
                  >
                    <ButtonIcon name={icon} size={22} />
                    <ButtonLabel>{label}</ButtonLabel>
                  </ActionButton>
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
        </AppBox>
      )}

      {photo && (
        <AppBox variant="media" padding="sm" style={styles.photoPreview}>
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
          <IconButton
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            onPress={() => setPhoto(null)}
          >
            <ButtonIcon name="close" size={20} />
          </IconButton>
        </AppBox>
      )}

      <AppBox variant="field" padding="field" style={styles.composer}>
        <IconButton selected={composerPanel === "photos"}
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
        >
          <ButtonIcon
            name="image-outline"
            size={21}
          />
        </IconButton>
        <IconButton selected={composerPanel === "suggestions"}
          accessibilityRole="button"
          accessibilityLabel="Magic suggestions"
          accessibilityState={{ expanded: composerPanel === "suggestions" }}
          onPress={() =>
            setComposerPanel((current) =>
              current === "suggestions" ? null : "suggestions",
            )
          }
        >
          <ButtonIcon
            name="sparkles-outline"
            size={20}
          />
        </IconButton>
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
        <IconButton variant="primary"
          accessibilityLabel={isTyping ? "Stop response" : "Send message"}
          accessibilityRole="button"

          disabled={!isTyping && (!inputText.trim() || !canSend || !!photo)}
          onPress={isTyping ? onStop : onSend}
        >
          <ButtonIcon
            name={isTyping ? "stop" : "arrow-up"}
            size={21}
          />
        </IconButton>
      </AppBox>
    </>
  );
}

const themedStyles = createEditorialStyles(() => ({
  pressed: { opacity: 0.62 },
  composerPanel: { marginBottom: 8 },
  composerPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  composerPanelTitle: { ...Type.bodyStrong, color: Palette.ink },
  photoNote: { ...Type.caption, color: Palette.muted },
  photoSources: { flexDirection: "row", gap: 8, marginTop: 12 },
  photoPreview: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  photoThumbnail: { width: 56, height: 56, borderRadius: 6 },
  photoPreviewCopy: { flex: 1, minWidth: 0, gap: 4 },
  composer: { minHeight: 46, maxHeight: 108, flexDirection: "row", alignItems: "flex-end" },
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
}));
