import React from 'react';

import {duaaData} from '../data';
import {duaaRepeatContext} from '../store';
import {DevotionalListScreen} from './DevotionalListScreen';

export const DuaaScreen = () => {
  return <DevotionalListScreen items={duaaData} repeatCtx={duaaRepeatContext} scope="duaa" title="الأدعية" />;
};
