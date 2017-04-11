import { ElementRef } from '@angular/core';
import { DejaMouseDragDropService } from './mouse-dragdrop.service';
export declare class DejaMouseDraggableDirective {
    private _context;
    context: IDejaMouseDraggableContext;
    constructor(elementRef: ElementRef, dragDropService: DejaMouseDragDropService);
}
export interface IDejaMouseDraggableContext {
    target?: string;
    className?: string;
    dragStart?: (HTMLElement) => any;
}