import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ButtonLabel, ChoiceChip } from '@/components/app-controls';
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";


import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { AppCheckbox } from "@/components/native-controls";
import { AppMark } from "../components";
import type { InstalledApp } from "../model";
import type { SelectedAppDraft } from '../editor-draft-model';
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
  selectedApps: SelectedAppDraft[];
  selectedIds: ReadonlySet<string>;
  filteredApps: InstalledApp[];
  toggleApp: (id: string) => void;
  updateLimit: (id: string, value: string | number) => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeading>Installed apps</SectionHeading>
      <AppBox variant="field" padding="field" style={styles.searchBox}>
        <Ionicons name="search" size={18} color={EditorialColors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search installed apps"
          placeholderTextColor={EditorialColors.muted}
          style={styles.searchInput}
          accessibilityLabel="Search installed apps"
        />
      </AppBox>
      <Text style={styles.selectionCount}>
        {selectedApps.length} APPS SELECTED
      </Text>
      {filteredApps.length ? (
        filteredApps.map((app) => {
          const selected = selectedIds.has(app.id);
          const selectedApp = selectedApps.find((item) => item.id === app.id);
          return (
            <AppBox variant="group" key={app.id} style={styles.appRowWrap}>
              <View style={styles.appRow}>
                <AppMark app={app} />
                <View style={styles.appCopy}>
                  <AppCheckbox label={app.name} value={selected} onValueChange={() => toggleApp(app.id)} />
                  <Text style={styles.appCategory}>{app.category}</Text>
                </View>
              </View>
              {selected && selectedApp ? (
                <AppBox variant="inset" padding="sm" style={styles.limitEditor}>
                  <Text style={styles.limitLabel}>Daily limit</Text>
                  <View style={styles.chipRow}>
                    {[15, 30, 60, 120].map((minutes) => (
                      <ChoiceChip selected={selectedApp.limitMinutes === minutes}
                        key={minutes}
                        accessibilityLabel={`${app.name}, ${minutes} minute daily limit`}
                        onPress={() => updateLimit(app.id, minutes)}
                      >
                        <ButtonLabel>
                          {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                        </ButtonLabel>
                      </ChoiceChip>
                    ))}
                    <AppBox variant="field" padding="field" style={styles.customLimit}>
                      <TextInput
                        value={String(selectedApp.limitMinutes)}
                        onChangeText={(value) => updateLimit(app.id, value)}
                        keyboardType="number-pad"
                        style={styles.limitInput}
                        accessibilityLabel={`${app.name} custom limit in minutes`}
                      />
                      <Text style={styles.unit}>min</Text>
                    </AppBox>
                  </View>
                </AppBox>
              ) : null}
            </AppBox>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="search-outline"
            size={28}
            color={EditorialColors.muted}
          />
          <SectionHeading>No apps found</SectionHeading>
          <Text style={styles.emptyCopy}>
            Try a different app name or category.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
