import { pageToPixel, pixelToCanvas } from 'cornerstone-core';
import React, { Component } from 'react';
import styled from 'styled-components';
import { hitTestCircles } from '../geom/hitTestCircles';
import { InsightViewerGuestProps } from '../hooks/useInsightViewerSync';
import { Contour, Point } from '../types';

export interface UserCircleDrawerProps extends InsightViewerGuestProps {
  width: number;
  height: number;
  contours: Contour[];
  draw: boolean | HTMLElement | null;
  onFocus: (contour: Contour | null) => void;
  onAdd: (polygon: Point[], event: MouseEvent) => void;
  onRemove: (contour: Contour) => void;
  className?: string;
}

interface UserCircleDrawerState {
  p1: Point | null;
  p2: Point | null;
}

export class UserCircleDrawer extends Component<UserCircleDrawerProps, UserCircleDrawerState> {
  private svg: SVGSVGElement | null = null;
  private element: HTMLElement | null = null;
  private focused: Contour | null = null;
  private preventClickEvent: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  
  constructor(props: UserCircleDrawerProps) {
    super(props);
    
    this.state = {
      p1: null,
      p2: null,
    };
  }
  
  render() {
    return (
      <Svg ref={this.svgRef}
           role="figure"
           width={this.props.width}
           height={this.props.height}
           className={this.props.className}
           style={{
             position: 'absolute',
             top: 0,
             left: 0,
             width: this.props.width,
             height: this.props.height,
           }}>
        {
          this.props.cornerstoneRenderData &&
          this.state.p1 &&
          this.state.p2 &&
          (() => {
            const {x: x1, y: y1} = pixelToCanvas(this.props.cornerstoneRenderData.element, {
              x: this.state.p1[0],
              y: this.state.p1[1],
            });
            const {x: x2, y: y2} = pixelToCanvas(this.props.cornerstoneRenderData.element, {
              x: this.state.p2[0],
              y: this.state.p2[1],
            });
            const r: number = Math.sqrt(Math.pow(Math.abs(x2 - x1), 2) + Math.pow(Math.abs(y2 - y1), 2));
            
            return (
              <>
                <circle cx={x1} cy={y1} r={r} stroke="rgba(255, 255, 255, 0.3)"/>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255, 255, 255, 0.6)" strokeWidth={3}/>
                <circle cx={x1} cy={y1} r={3}/>
                <circle cx={x2} cy={y2} r={3}/>
              </>
            );
          })()
        }
      </Svg>
    );
  }
  
  svgRef = (svg: SVGSVGElement) => {
    if (svg && this.svg && this.element) {
      this.deactivateInitialEvents();
      this.deactivateDrawEvents();
      
      if (this.canActivate(this.props)) {
        this.svg = svg;
        this.element = this.getElement(this.props);
        this.activateInitialEvents();
      }
    }
    
    this.svg = svg;
  };
  
  componentDidMount() {
    if (!this.svg) throw new Error('<svg> is not initialized');
    
    if (this.canActivate(this.props)) {
      this.element = this.getElement(this.props);
      this.activateInitialEvents();
    }
  }
  
  componentDidUpdate(prevProps: Readonly<UserCircleDrawerProps>) {
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
  
  getElement = ({draw}: Readonly<UserCircleDrawerProps>): HTMLElement => {
    //@ts-ignore
    return draw instanceof HTMLElement ? draw : this.svg as HTMLElement;
  };
  
  canActivate = ({draw}: Readonly<UserCircleDrawerProps>) => {
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
    
    const {x, y} = pageToPixel(element, pageX, pageY);
    
    this.focused = hitTestCircles(this.props.contours, [x, y]);
    
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
    
    const {x, y} = pageToPixel(element, event.pageX, event.pageY);
    
    this.setState(prevState => ({
      ...prevState,
      p1: [x, y],
    }));
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
    
    if (!this.preventClickEvent && Math.max(Math.abs(event.pageX - this.startX), Math.abs(event.pageY - this.startY)) > 20) {
      this.preventClickEvent = true;
    }
    
    const element: HTMLElement = this.props.cornerstoneRenderData.element;
    
    const {x, y} = pageToPixel(element, event.pageX, event.pageY);
    
    this.setState(prevState => ({
      ...prevState,
      p2: [x, y],
    }));
  };
  
  onMouseUpToEndDraw = (event: MouseEvent) => {
    event.stopPropagation();
    
    this.deactivateDrawEvents();
    this.activateInitialEvents();
    
    if (this.state.p1 && this.state.p2) {
      this.props.onAdd([this.state.p1, this.state.p2], event);
    }
    
    this.setState(prevState => ({
      ...prevState,
      p1: null,
      p2: null,
    }));
  };
  
  onMouseLeaveToCancelDraw = (event: MouseEvent) => {
    event.stopPropagation();
    
    this.cancelDraw();
  };
  
  cancelDraw = () => {
    this.deactivateDrawEvents();
    this.activateInitialEvents();
    
    this.setState(prevState => ({
      ...prevState,
      p1: null,
      p2: null,
    }));
  };
}

const Svg = styled.svg`
  > circle {
    stroke: rgb(255,224,0);
    stroke-width: 3px;
    fill: rgba(255,224,0, 0.2);
  }
`;
