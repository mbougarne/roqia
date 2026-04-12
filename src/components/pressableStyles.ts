import {type ViewStyle} from 'react-native';

export const getPressableScaleStyle = (
  pressed: boolean,
  pressedOpacity = 0.88,
  pressedScale = 0.985,
): ViewStyle => ({
  opacity: pressed ? pressedOpacity : 1,
  transform: [{scale: pressed ? pressedScale : 1}],
});