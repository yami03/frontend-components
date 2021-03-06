import { pageToPixel } from 'cornerstone-core';
import React, { Component } from 'react';
import { hitTestContours } from '../geom/hitTestContours';
import { InsightViewerGuestProps } from '../hooks/useInsightViewerSync';
import { Contour, Point } from '../types';
import { cleanCanvas } from './draw/cleanCanvas';
import { drawActivePolygon } from './draw/drawActivePolygon';

export interface UserContourCanvasDrawerStyleProps {
  canvasStokeLineWidth: number;
  canvasStokeStyle: string;
  canvasFillStyle: string;
}

export interface UserContourCanvasDrawerProps<T extends Contour>
  extends InsightViewerGuestProps,
    Partial<UserContourCanvasDrawerStyleProps> {
  width: number;
  height: number;
  contours: T[];
  draw: boolean | HTMLElement | null;
  onFocus: (contour: T | null) => void;
  onAdd: (polygon: Point[], event: MouseEvent) => void;
  onRemove: (contour: T) => void;
}

export class UserContourCanvasDrawer<T extends Contour> extends Component<UserContourCanvasDrawerProps<T>, {}> {
  static defaultProps: UserContourCanvasDrawerStyleProps = {
    canvasStokeLineWidth: 3,
    canvasStokeStyle: 'rgb(255,224,0)',
    canvasFillStyle: 'rgba(255,224,0, 0.2)',
  };

  private canvas: HTMLCanvasElement | null = null;
  private element: HTMLElement | null = null;
  private ctx!: CanvasRenderingContext2D;
  private polygon: Point[] = [];
  private focused: T | null = null;
  private preventClickEvent: boolean = false;
  private startX: number = 0;
  private startY: number = 0;

  render() {
    return (
      <canvas
        ref={this.canvasRef}
        role="figure"
        width={this.props.width}
        height={this.props.height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: this.props.width,
          height: this.props.height,
        }}
      />
    );
  }

  canvasRef = (canvas: HTMLCanvasElement) => {
    if (canvas && this.canvas && this.element) {
      this.deactivateInitialEvents();
      this.deactivateDrawEvents();

      if (this.canActivate(this.props)) {
        this.canvas = canvas;
        this.element = this.getElement(this.props);
        this.activateInitialEvents();
      }
    }

    this.canvas = canvas;
  };

  componentDidMount() {
    if (!this.canvas) throw new Error('<canvas> is not initialized');

    const ctx = this.canvas.getContext('2d');

    if (!ctx) throw new Error('<canvas> context 2d is not initialized');

    this.ctx = ctx;

    if (this.canActivate(this.props)) {
      this.element = this.getElement(this.props);
      this.activateInitialEvents();
    }
  }

  componentDidUpdate(prevProps: Readonly<UserContourCanvasDrawerProps<T>>) {
    if (prevProps.draw !== this.props.draw) {
      if (this.element) {
        this.deactivateInitialEvents();
        this.deactivateDrawEvents();
      }

      if (this.canActivate(this.props)) {
        this.element = this.getElement(this.props);
        this.activateInitialEvents();
      }
    }
  }

  componentWillUnmount() {
    if (this.element) {
      this.deactivateInitialEvents();
      this.deactivateDrawEvents();
    }
  }

  getElement = ({ draw }: Readonly<UserContourCanvasDrawerProps<T>>): HTMLElement | null => {
    if (draw instanceof HTMLElement) return draw;
    if (this.canvas) return this.canvas;
    return null;
  };

  canActivate = ({ draw }: Readonly<UserContourCanvasDrawerProps<T>>) => {
    return draw instanceof HTMLElement || draw === true;
  };

  // ---------------------------------------------
  // initial events
  // ---------------------------------------------
  activateInitialEvents = () => {
    if (!this.element) return;
    this.element.addEventListener('mousemove', this.onMouseMoveToFindFocus);
    this.element.addEventListener('mousedown', this.onMouseDownToStartDraw);
    this.element.addEventListener('click', this.onMouseClickToRemove);
  };

  deactivateInitialEvents = () => {
    if (!this.element) return;
    this.element.removeEventListener('mousemove', this.onMouseMoveToFindFocus);
    this.element.removeEventListener('mousedown', this.onMouseDownToStartDraw);
    this.element.removeEventListener('click', this.onMouseClickToRemove);
  };

  onMouseMoveToFindFocus = (event: MouseEvent) => {
    event.stopPropagation();

    this.findFocus(event.pageX, event.pageY);
  };

  findFocus = (pageX: number, pageY: number) => {
    if (!this.props.contours || this.props.contours.length === 0 || !this.props.cornerstoneRenderData) return;

    const element: HTMLElement = this.props.cornerstoneRenderData.element;

    const { x, y } = pageToPixel(element, pageX, pageY);

    this.focused = hitTestContours(this.props.contours, [x, y]);

    this.props.onFocus(this.focused);
  };

  onMouseClickToRemove = (event: MouseEvent) => {
    event.stopPropagation();

    if (!this.focused || this.preventClickEvent) return;

    this.props.onRemove(this.focused);
  };

  // ---------------------------------------------
  // draw events
  // ---------------------------------------------
  onMouseDownToStartDraw = (event: MouseEvent) => {
    event.stopPropagation();

    if (!this.props.cornerstoneRenderData) {
      throw new Error('cornerstoneRenderEventData를 찾을 수 없다!');
    }

    this.preventClickEvent = false;
    this.startX = event.pageX;
    this.startY = event.pageY;

    this.deactivateInitialEvents();
    this.activateDrawEvents();

    const element: HTMLElement = this.props.cornerstoneRenderData.element;

    const { x, y } = pageToPixel(element, event.pageX, event.pageY);
    this.polygon = [[x, y]];
  };

  activateDrawEvents = () => {
    if (!this.element) return;
    this.element.addEventListener('mousemove', this.onMouseMoveToDraw);
    this.element.addEventListener('mouseup', this.onMouseUpToEndDraw);
    this.element.addEventListener('mouseleave', this.onMouseLeaveToCancelDraw);
  };

  deactivateDrawEvents = () => {
    if (!this.element) return;
    this.element.removeEventListener('mousemove', this.onMouseMoveToDraw);
    this.element.removeEventListener('mouseup', this.onMouseUpToEndDraw);
    this.element.removeEventListener('mouseleave', this.onMouseLeaveToCancelDraw);
  };

  onMouseMoveToDraw = (event: MouseEvent) => {
    event.stopPropagation();

    if (!this.props.cornerstoneRenderData) {
      throw new Error('cornerstoneRenderEventData를 찾을 수 없다!');
    }

    if (
      !this.preventClickEvent &&
      Math.max(Math.abs(event.pageX - this.startX), Math.abs(event.pageY - this.startY)) > 20
    ) {
      this.preventClickEvent = true;
    }

    const element: HTMLElement = this.props.cornerstoneRenderData.element;

    const { x, y } = pageToPixel(element, event.pageX, event.pageY);
    this.polygon.push([x, y]);

    cleanCanvas(this.ctx!, this.props.width, this.props.height);
    drawActivePolygon(
      this.props.cornerstoneRenderData,
      this.ctx!,
      this.polygon,
      this.props.canvasStokeLineWidth,
      this.props.canvasStokeStyle,
      this.props.canvasFillStyle,
    );
  };

  onMouseUpToEndDraw = (event: MouseEvent) => {
    event.stopPropagation();

    this.deactivateDrawEvents();
    this.activateInitialEvents();

    cleanCanvas(this.ctx!, this.props.width, this.props.height);

    this.props.onAdd(this.polygon, event);
    this.polygon = [];
  };

  onMouseLeaveToCancelDraw = (event: MouseEvent) => {
    event.stopPropagation();

    this.cancelDraw();
  };

  cancelDraw = () => {
    cleanCanvas(this.ctx!, this.props.width, this.props.height);

    this.polygon = [];

    this.deactivateDrawEvents();
    this.activateInitialEvents();
  };
}
