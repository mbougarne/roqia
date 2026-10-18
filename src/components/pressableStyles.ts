import {type ViewStyle} from 'react-native';

export const getPressableScaleStyle = (
  pressed: boolean,
  pressedOpacity = 0.88,
  _pressedScale = 0.985,
): ViewStyle => ({
  opacity: pressed ? pressedOpacity : 1,
  // Opacity-only feedback also respects the reduced-motion preference.
});
