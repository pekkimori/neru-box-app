import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ChoiceCard } from '@/components/app-controls';

import { GACHA_BANNERS, type GachaBanner } from './pokemon-catalog';
import { Text, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { gachaStyles } from './gacha-styles';

function BannerArtwork({
  banner,
  compact = false,
}: {
  banner: GachaBanner;
  compact?: boolean;
}) {
  const styles = useThemedStyles(gachaStyles);

  return (
    <View
      style={[
        styles.artworkStage,
        styles.noPointerEvents,
        compact && styles.artworkStageCompact,
      ]}
    >
      <View
        style={[
          styles.verticalField,
          compact && styles.verticalFieldCompact,
          { backgroundColor: banner.accent },
        ]}
      />
    </View>
  );
}
function BannerSelector({
  banner,
  selected,
  onPress,
}: {
  banner: GachaBanner;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(gachaStyles);
  const { colors: Palette } = useAppTheme();

  return (
    <ChoiceCard
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${banner.title} banner`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bannerSelector,
        selected && styles.bannerSelectorSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.bannerSelectorCopy}>
        <Text
          style={[styles.bannerCode, selected && styles.bannerCodeSelected]}
        >
          {banner.code}
        </Text>
        <Text style={styles.bannerSelectorTitle}>{banner.title}</Text>
        <Text style={styles.bannerSelectorSubtitle}>{banner.subtitle}</Text>
      </View>
      <BannerArtwork banner={banner} compact />
      <View
        style={[
          styles.bannerActiveMark,
          { backgroundColor: selected ? banner.accent : Palette.line },
        ]}
      />
    </ChoiceCard>
  );
}
export function GachaBanners({ selectedBanner, onSelect, bannerWidth, catalogLoading, poolSize }: {
  selectedBanner: GachaBanner; onSelect: (id: string) => void; bannerWidth: number; catalogLoading: boolean; poolSize: number;
}) {
  const styles = useThemedStyles(gachaStyles);
  return (<>
    <AppBox variant="inset" padding="none" style={styles.heroCard}>
      <View style={styles.heroCopy}>
        <Text style={styles.heroCode}>{selectedBanner.code} / ACTIVE</Text>
        <Text style={styles.heroTitle}>{selectedBanner.title}</Text>
        <View style={styles.heroStatusRow}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: selectedBanner.accent },
            ]}
          />
          <Text style={styles.heroStatus}>
            {catalogLoading
              ? "SYNCING POKÉAPI CATALOG"
              : `${poolSize} SPECIES IN CURRENT POOL`}
          </Text>
        </View>
      </View>
      <BannerArtwork banner={selectedBanner} />
    </AppBox>

    <View style={styles.sectionHeading}>
      <View>
        <Text style={styles.sectionTitle}>Choose a banner</Text>
      </View>
      <Text style={styles.sectionCount}>
        {GACHA_BANNERS.length} available
      </Text>
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.bannerRail}
      snapToInterval={bannerWidth + 12}
      decelerationRate="fast"
    >
      {GACHA_BANNERS.map((banner) => (
        <View key={banner.id} style={{ width: bannerWidth }}>
          <BannerSelector
            banner={banner}
            selected={banner.id === selectedBanner.id}
            onPress={() => onSelect(banner.id)}
          />
        </View>
      ))}
    </ScrollView>


  </>);
}
