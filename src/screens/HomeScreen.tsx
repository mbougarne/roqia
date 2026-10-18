import React from 'react';
import {data} from '../data';
import {homeRepeatContext} from '../store';
import {DevotionalListScreen} from './DevotionalListScreen';
export const HomeScreen = () => (
  <DevotionalListScreen
    root
    title="الرقية الشرعية"
    items={data}
    repeatCtx={homeRepeatContext}
  />
);
