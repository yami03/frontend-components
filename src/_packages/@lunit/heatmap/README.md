# Heatmap

Heatmap 처리에 관련된 라이브러리

- `engineResult.posMap`을 화면에 그리는데 관련된 것들
    - `posMapToImageData(posMap: number[][], thoreshold: number<0-1>): ImageData`  
- Heatmap Legend를 그리는데 관련된 것들
    - `<HeatmapScaleSVGImage width={number} height={number} threshold?={number<0-1>} />`
    - `useHeatmapScaleImageURI({width: number, height: number, threshold: number<0-1>}): string | null`
- Heatmap RGBA 계산
    - `getAlpha({stop: number<0-1>, threshold: number<0-1>}): number`
    - `getRGBArray({stop: number<0-1>, threshold: number<0-1>}): [number, number, number]`
    - `getRGBAArray({stop: number<0-1>, threshold: number<0-1>}): [number, number, number, number]`

# Install

```sh
npm install @lunit/heatmap
```

# Sample Codes

[Storybook](https://lunit-io.github.io/opt-tool-frontend)

## Stories

<!-- import **/*.stories.{ts,tsx} --title-tag h3 -->

### \_\_stories\_\_/HeatmapScaleSVGImage.stories.tsx


```tsx
import { HeatmapScaleSVGImage } from '@lunit/heatmap';
import { withInsightViewerStorybookGlobalStyle } from '@lunit/insight-viewer';
import { withOPTComponentsStorybookGlobalStyle } from '@lunit/opt-components';
import { number, withKnobs } from '@storybook/addon-knobs';
import React from 'react';

export default {
  title: 'heatmap',
  decorators: [withInsightViewerStorybookGlobalStyle, withOPTComponentsStorybookGlobalStyle, withKnobs],
};

export const HeatmapScaleSVGImageSample = () => {
  const width: number = number('Width', 300, { range: true, step: 10, min: 100, max: 600 });
  const height: number = number('Height', 100, { range: true, step: 10, min: 60, max: 300 });
  const threshold: number = number('Threshold', 0, { range: true, step: 0.1, min: 0, max: 1 });

  return (
    <svg width={width} height={height}>
      <rect width={width} height={height} fill="#000000" />
      <HeatmapScaleSVGImage width={width} height={height} threshold={threshold} />
    </svg>
  );
};

HeatmapScaleSVGImageSample.story = {
  name: '<HeatmapScaleSVGImageSample>',
};

```


### \_\_stories\_\_/posMapToImageData.stories.tsx


```tsx
import { posMapToImageData } from '@lunit/heatmap';
import data from '@lunit/heatmap/__stories__/posMap.sample.json';
import { withInsightViewerStorybookGlobalStyle } from '@lunit/insight-viewer';
import { withOPTComponentsStorybookGlobalStyle } from '@lunit/opt-components';
import { withKnobs } from '@storybook/addon-knobs';
import React, { MutableRefObject, useEffect, useMemo, useRef } from 'react';

export default {
  title: 'heatmap',
  decorators: [withInsightViewerStorybookGlobalStyle, withOPTComponentsStorybookGlobalStyle, withKnobs],
};

export const posMapToImageDataSample = () => {
  const canvasRef: MutableRefObject<HTMLCanvasElement | null> = useRef<HTMLCanvasElement | null>(null);

  // AI에서 나온 posMap 결과를 ImageData로 변환한다
  const imageData = useMemo<ImageData>(() => {
    return posMapToImageData(data.engine_result.engine_result.pos_map, 0.1);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) throw new Error('<canvas> is null');
    const ctx: CanvasRenderingContext2D | null = canvasRef.current.getContext('2d');
    if (!ctx) throw new Error('ctx is null');

    // ImageData를 Canvas Context에 그린다
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  return (
    <canvas
      ref={canvasRef}
      width={imageData.width}
      height={imageData.height}
      style={{
        width: imageData.width,
        height: imageData.height,
      }}
    />
  );
};

posMapToImageDataSample.story = {
  name: 'posMapToImageDataSample()',
};

```


### \_\_stories\_\_/useHeatmapScaleImageURI.stories.tsx


```tsx
import { useHeatmapScaleImageURI } from '@lunit/heatmap';
import { withInsightViewerStorybookGlobalStyle } from '@lunit/insight-viewer';
import { withOPTComponentsStorybookGlobalStyle } from '@lunit/opt-components';
import { number, withKnobs } from '@storybook/addon-knobs';
import React from 'react';

export default {
  title: 'heatmap',
  decorators: [withInsightViewerStorybookGlobalStyle, withOPTComponentsStorybookGlobalStyle, withKnobs],
};

export const useHeatmapScaleImageURISample = () => {
  const width: number = number('Width', 300, { range: true, step: 10, min: 100, max: 600 });
  const height: number = number('Height', 100, { range: true, step: 10, min: 60, max: 300 });
  const threshold: number = number('Threshold', 0, { range: true, step: 0.1, min: 0, max: 1 });

  const dataUri: string | null = useHeatmapScaleImageURI({ width, height, threshold });

  return dataUri ? <img src={dataUri} style={{ width, height, backgroundColor: '#000000' }} alt="test" /> : null;
};

useHeatmapScaleImageURISample.story = {
  name: 'useHeatmapScaleImageURI()',
};

```

<!-- importend -->

## Tests

<!-- import __tests__/*.{ts,tsx} --title-tag h3 -->

### \_\_tests\_\_/heatmap.test.ts


```ts
import { getAlpha, getRGBAArray, getRGBArray } from '@lunit/heatmap';

describe('@lunit/heatmap', () => {
  test('getRGBArray', () => {
    expect(getRGBArray(0)).toEqual([0, 0, 255]);
    expect(getRGBArray(0.25)).toEqual([0, 255, 255]);
    expect(getRGBArray(0.5)).toEqual([0, 255, 0]);
    expect(getRGBArray(0.75)).toEqual([255, 255, 0]);
    expect(getRGBArray(1)).toEqual([255, 0, 0]);
  });

  test('getAlpha', () => {
    expect(getAlpha({ threshold: 0, stop: 0 })).toEqual(0);
    expect(getAlpha({ threshold: 0, stop: 0.25 })).toEqual(0.1875);
    expect(getAlpha({ threshold: 0, stop: 0.5 })).toEqual(0.375);
    expect(getAlpha({ threshold: 0, stop: 0.75 })).toEqual(0.5625);
    expect(getAlpha({ threshold: 0, stop: 1 })).toEqual(0.75);

    // threshold : 특정 stop 영역을 drop (alpha 0) 시키기 위한 값
    // stop < threshold -> alpha는 0이 된다
    expect(getAlpha({ threshold: 0.5, stop: 0.49 })).toEqual(0);
  });

  test('getRGBAArray', () => {
    expect(getRGBAArray({ threshold: 0, stop: 0 })).toEqual([0, 0, 0, 0]);
    expect(getRGBAArray({ threshold: 0, stop: 0.25 })).toEqual([0, 255, 255, 0.1875]);
    expect(getRGBAArray({ threshold: 0, stop: 0.5 })).toEqual([0, 255, 0, 0.375]);
    expect(getRGBAArray({ threshold: 0, stop: 0.75 })).toEqual([255, 255, 0, 0.5625]);
    expect(getRGBAArray({ threshold: 0, stop: 1 })).toEqual([255, 0, 0, 0.75]);

    // stop < threshold -> alpha는 0이 된다
    expect(getRGBAArray({ threshold: 0.5, stop: 0.49 })).toEqual([0, 0, 0, 0]);
  });
});

```

<!-- importend -->