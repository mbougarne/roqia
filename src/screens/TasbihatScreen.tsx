import React from 'react';

import {tasbihatData} from '../data';
import {tasbihatRepeatContext} from '../store';
import {DevotionalListScreen} from './DevotionalListScreen';

export const TasbihatScreen = () => {
  return <DevotionalListScreen items={tasbihatData} repeatCtx={tasbihatRepeatContext} scope="tasbihat" title="التسبيحات" />;
};
