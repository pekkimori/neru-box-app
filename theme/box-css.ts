import type { CSSProperties } from 'react';
import type { EditorialPalette } from './editorial-theme';
import { boxStyle, type BoxOptions } from './boxes';

/** CSS adapter for browser-owned fields and the archive's spatial DOM layer. */
export function boxCSSStyle(colors: EditorialPalette, options: BoxOptions = {}): CSSProperties {
  const style = boxStyle(colors, options);
  return {
    backgroundColor: style.backgroundColor as string,
    borderRadius: style.borderRadius as number,
    borderWidth: style.borderWidth as number,
    borderColor: style.borderColor as string,
    borderStyle: style.borderStyle ?? (style.borderWidth !== undefined ? 'solid' : undefined),
    borderTopLeftRadius: style.borderTopLeftRadius as number,
    borderTopRightRadius: style.borderTopRightRadius as number,
    borderLeftWidth: style.borderLeftWidth as number,
    borderLeftColor: style.borderLeftColor as string,
    padding: style.padding as number,
    paddingInline: style.paddingHorizontal as number,
    paddingBlock: style.paddingVertical as number,
    minHeight: style.minHeight as number,
    overflow: style.overflow === 'hidden' ? 'hidden' : undefined,
    boxShadow: typeof style.boxShadow === 'string' ? style.boxShadow : undefined,
  };
}
