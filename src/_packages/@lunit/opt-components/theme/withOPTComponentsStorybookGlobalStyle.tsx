import { DecoratorFunction } from '@storybook/addons';
import React, { createElement, isValidElement } from 'react';
import { createGlobalStyle } from 'styled-components';
import { ThemeProvider } from './context';
import { globalStyle } from './style';

const StorybookGlobalStyle = createGlobalStyle`
  html {
    font-size: 14px;
    box-sizing: border-box;
  }
  
  ${globalStyle}
`;

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withOPTComponentsStorybookGlobalStyle: DecoratorFunction<any> = storyFn => {
  const story = storyFn();

  return (
    <ThemeProvider>
      <StorybookGlobalStyle />
      {typeof story === 'function' ? (
        createElement(story)
      ) : isValidElement(story) ? (
        story
      ) : (
        <div>story is not valid element</div>
      )}
    </ThemeProvider>
  );
};
