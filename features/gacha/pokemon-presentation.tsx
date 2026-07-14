import { Image } from 'expo-image';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, Text, View, type ImageStyle } from 'react-native';
import { MotionPressable as Pressable } from '@/components/motion';

import type { GachaCreature } from '@/constants/gacha';
import { POKEMON_CRY_VOLUME } from '@/utils/interaction-feedback';
import { getPokemonMedia, playPokemonCryOnWeb, playPreparedPokemonCry, type PokemonMedia } from './pokemon-media';

type PokemonSpriteSide = 'front' | 'back';

export function PokemonPresentation({
  pokemon,
  active,
  size,
  autoPlayCry = true,
}: {
  pokemon: GachaCreature;
  active: boolean;
  size: number;
  autoPlayCry?: boolean;
}) {
  const player = useAudioPlayer(null, { downloadFirst: true });
  const playerStatus = useAudioPlayerStatus(player);
  const rotation = useRef(new Animated.Value(0)).current;
  const sessionRef = useRef(0);
  const handledNativePlayRef = useRef(0);
  const [media, setMedia] = useState<PokemonMedia | null>(null);
  const [side, setSide] = useState<PokemonSpriteSide>('front');
  const [loading, setLoading] = useState(active);
  const [error, setError] = useState(false);
  const [nativePlayRequest, setNativePlayRequest] = useState(0);

  const animateTo = useCallback((value: number, duration: number) => {
    return new Promise<boolean>((resolve) => {
      Animated.timing(rotation, {
        toValue: value,
        duration,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => resolve(finished));
    });
  }, [rotation]);

  const present = useCallback(async (nextMedia: PokemonMedia, playCry = true) => {
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    rotation.stopAnimation();
    rotation.setValue(0);
    setSide('front');

    if (playCry && nextMedia.cry) {
      if (Platform.OS === 'web') {
        playPokemonCryOnWeb(nextMedia.cry, pokemon.id);
      } else if (!playPreparedPokemonCry(pokemon.id, nextMedia.cry)) {
        player.replace(nextMedia.cry);
        player.volume = POKEMON_CRY_VOLUME;
        setNativePlayRequest((current) => current + 1);
      }
    }

    for (let index = 0; index < 4; index += 1) {
      if (sessionRef.current !== session) return;
      const firstHalfFinished = await animateTo(90, 145);
      if (!firstHalfFinished || sessionRef.current !== session) return;
      setSide((current) => current === 'front' && nextMedia.backSprite ? 'back' : 'front');
      rotation.setValue(-90);
      const secondHalfFinished = await animateTo(0, 145);
      if (!secondHalfFinished) return;
    }
    setSide('front');
  }, [animateTo, player, pokemon.id, rotation]);

  useEffect(() => {
    if (Platform.OS === 'web' || !playerStatus.isLoaded || nativePlayRequest <= handledNativePlayRef.current) return;
    handledNativePlayRef.current = nativePlayRequest;
    void player.seekTo(0).then(() => player.play());
  }, [nativePlayRequest, player, playerStatus.isLoaded]);

  useEffect(() => {
    if (!active) {
      sessionRef.current += 1;
      rotation.stopAnimation();
      return;
    }

    const controller = new AbortController();
    let mounted = true;
    setLoading(true);
    setError(false);

    getPokemonMedia(pokemon.id, controller.signal)
      .then((nextMedia) => {
        if (!mounted) return;
        setMedia(nextMedia);
        setLoading(false);
        present(nextMedia, autoPlayCry);
      })
      .catch(() => {
        if (!mounted || controller.signal.aborted) return;
        setLoading(false);
        setError(true);
      });

    return () => {
      mounted = false;
      controller.abort();
      sessionRef.current += 1;
      rotation.stopAnimation();
    };
  }, [active, autoPlayCry, pokemon.id, present, rotation]);

  const sprite = side === 'back' && media?.backSprite ? media.backSprite : media?.frontSprite;
  const rotateY = rotation.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ['-90deg', '0deg', '90deg'],
  });
  const spriteStyle = Platform.OS === 'web'
    ? ({ width: size, height: size, imageRendering: 'pixelated' } as unknown as ImageStyle)
    : { width: size, height: size };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Replay ${pokemon.name} cry and flip animation`}
      accessibilityState={{ disabled: !media }}
      disabled={!media}
      onPress={() => media && present(media, true)}
      style={styles.container}
    >
      {sprite ? (
        <Animated.View style={{ transform: [{ perspective: 700 }, { rotateY }] }}>
          <Image
            source={{ uri: sprite }}
            style={spriteStyle}
            contentFit={Platform.OS === 'web' ? 'contain' : 'none'}
            transition={0}
          />
        </Animated.View>
      ) : (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <ActivityIndicator color="#E21D2F" /> : null}
          {error ? <Text style={styles.errorText}>Media unavailable</Text> : null}
        </View>
      )}
      {Platform.OS === 'web' && media?.cry ? <View style={styles.audioHint}><Text style={styles.audioHintText}>Tap for cry</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  errorText: { fontSize: 10, fontWeight: '700', color: '#929292', textAlign: 'center' },
  audioHint: { position: 'absolute', bottom: 1, borderRadius: 5, backgroundColor: 'rgba(23, 23, 23, 0.78)', paddingHorizontal: 7, paddingVertical: 3 },
  audioHintText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5, color: '#FFFFFF', textTransform: 'uppercase' },
});
