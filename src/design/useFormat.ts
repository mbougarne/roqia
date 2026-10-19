import {useContext, useMemo} from 'react';

import {themeContext} from '../store';
import {createFormatters} from './format';

export function useFormat() {
  const {digitStyle} = useContext(themeContext);
  return useMemo(() => createFormatters(digitStyle), [digitStyle]);
}
