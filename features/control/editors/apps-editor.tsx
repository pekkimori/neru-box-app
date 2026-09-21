import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, View } from "react-native";

import {
  MotionPressable as Pressable,
  MotionTouchableOpacity as TouchableOpacity,
} from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { AppMark } from "../components";
import type { InstalledApp, SelectedApp } from "../model";
import { controlStyles } from "../styles";

export function AppsEditorContent({
  search,
  setSearch,
  selectedApps,
  selectedIds,
  filteredApps,
  toggleApp,
  updateLimit,
}: {
  search: string;
  setSearch: (value: string) => void;
  selectedApps: SelectedApp[];
  selectedIds: ReadonlySet<string>;
  filteredApps: InstalledApp[];
  toggleApp: (id: string) => void;
  updateLimit: (id: string, value: string | number) => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={EditorialColors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search installed apps"
          placeholderTextColor={EditorialColors.muted}
          style={styles.searchInput}
          accessibilityLabel="Search installed apps"
        />
      </View>
      <Text style={styles.selectionCount}>
        {selectedApps.length} APPS SELECTED
      </Text>
      {filteredApps.length ? (
        filteredApps.map((app) => {
          const selected = selectedIds.has(app.id);
          const selectedApp = selectedApps.find((item) => item.id === app.id);
          return (
            <View key={app.id} style={styles.appRowWrap}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleApp(app.id)}
                style={({ pressed }) => [
                  styles.appRow,
                  pressed && styles.pressed,
                ]}
              >
                <AppMark app={app} />
                <View style={styles.appCopy}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appCategory}>{app.category}</Text>
                </View>
                <View
                  style={[styles.checkbox, selected && styles.checkboxSelected]}
                >
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={17}
                      color={EditorialColors.onAccent}
                    />
                  ) : null}
                </View>
              </Pressable>
              {selected && selectedApp ? (
                <View style={styles.limitEditor}>
                  <Text style={styles.limitLabel}>Daily limit</Text>
                  <View style={styles.chipRow}>
                    {[15, 30, 60, 120].map((minutes) => (
                      <TouchableOpacity
                        key={minutes}
                        accessibilityLabel={`${app.name}, ${minutes} minute daily limit`}
                        onPress={() => updateLimit(app.id, minutes)}
                        style={[
                          styles.chip,
                          selectedApp.limitMinutes === minutes &&
                            styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedApp.limitMinutes === minutes &&
                              styles.chipTextActive,
                          ]}
                        >
                          {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <View style={styles.customLimit}>
                      <TextInput
                        value={String(selectedApp.limitMinutes)}
                        onChangeText={(value) => updateLimit(app.id, value)}
                        keyboardType="number-pad"
                        style={styles.limitInput}
                        accessibilityLabel={`${app.name} custom limit in minutes`}
                      />
                      <Text style={styles.unit}>min</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="search-outline"
            size={28}
            color={EditorialColors.muted}
          />
          <Text style={styles.emptyTitle}>No apps found</Text>
          <Text style={styles.emptyCopy}>
            Try a different app name or category.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
