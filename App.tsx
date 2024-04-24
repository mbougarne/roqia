import React, {useState, useEffect} from 'react';
import {ScrollView, StatusBar} from 'react-native';

import {Header, Section} from './components';
import {data, DataProps} from './data';

const getID = () => {
  const timeStamp = Date.now().toString();
  const randomNumber = Math.random().toString().split('.')[1];

  return `${timeStamp}-${randomNumber}`;
};

export default function App(): JSX.Element {
  const [content, setContent] = useState([{}]);

  useEffect(() => {
    setContent(data);
  }, []);

  return (
    <ScrollView>
      <StatusBar barStyle="light-content" />
      <Header />
      {content.length &&
        content.map((item: DataProps) => (
          <Section
            key={getID()}
            caption={item.caption}
            content={item.content}
          />
        ))}
    </ScrollView>
  );
}
