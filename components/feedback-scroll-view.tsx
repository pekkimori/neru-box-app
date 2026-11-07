import { forwardRef, type ComponentRef, type Ref } from 'react';
import {
  FlatList as NativeFlatList,
  ScrollView as NativeScrollView,
  type FlatListProps,
  type ScrollViewProps,
} from 'react-native';

import { playSwipeFeedback } from '@/utils/interaction-feedback';

type ScrollViewRef = ComponentRef<typeof NativeScrollView>;
export type FlatList<ItemT> = NativeFlatList<ItemT>;

// Drag-begin fires once for a user's swipe, never for momentum or scrollTo.
// Preserve the native scroll views, refs, and callers' existing handlers.
export const ScrollView = forwardRef<ScrollViewRef, ScrollViewProps>(function ScrollView(
  { onScrollBeginDrag, ...props }, ref,
) {
  return <NativeScrollView {...props} ref={ref} onScrollBeginDrag={(event) => {
    playSwipeFeedback();
    onScrollBeginDrag?.(event);
  }} />;
});

function FeedbackFlatList<ItemT>({
  onScrollBeginDrag, ref, ...props
}: FlatListProps<ItemT> & { ref?: Ref<NativeFlatList<ItemT>> }) {
  return <NativeFlatList {...props} ref={ref} onScrollBeginDrag={(event) => {
    playSwipeFeedback();
    onScrollBeginDrag?.(event);
  }} />;
}

export { FeedbackFlatList as FlatList };
