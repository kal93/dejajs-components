/*
 *  @license
 *  Copyright Hôpitaux Universitaires de Genève. All Rights Reserved.
 *
 *  Use of this source code is governed by an Apache-2.0 license that can be
 *  found in the LICENSE file at https://github.com/DSI-HUG/dejajs-components/blob/master/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
    Directive,
    DoCheck,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    Self
} from '@angular/core';
import { FormGroupDirective, NgControl, NgForm } from '@angular/forms';
import {
    _MatInputMixinBase,
    CanUpdateErrorState,
    ErrorStateMatcher,
    MatFormFieldControl
} from '@angular/material';
import { Subject } from 'rxjs';
import { DejaEditorComponent } from '../deja-editor.component';

let nextUniqueId = 0;

@Directive({
    selector: 'deja-editor',
    providers: [
        { provide: MatFormFieldControl, useExisting: DejaEditorSelectorDirective }
    ]
})
export class DejaEditorSelectorDirective extends _MatInputMixinBase
    implements
        MatFormFieldControl<any>,
        DoCheck,
        OnInit,
        OnDestroy,
        CanUpdateErrorState {
    public errorState: boolean;
    public autofilled?: boolean;
    protected _uid = `mat-input-${nextUniqueId++}`;
    public value: any;
    public stateChanges: Subject<void> = new Subject<void>();
    @Input()
    get id(): string {
        return this._id;
    }
    set id(value: string) {
        this._id = value || this._uid;
    }
    protected _id: string;
    @Input() public placeholder: string;
    public focused: boolean;
    @Input()
    get required(): boolean {
        return this._required;
    }
    set required(value: boolean) {
        this._required = coerceBooleanProperty(value);
    }
    protected _required = false;
    @Input()
    get disabled(): boolean {
        if (this.ngControl && this.ngControl.disabled !== null) {
            return this.ngControl.disabled;
        }
        return this._disabled;
    }
    set disabled(value: boolean) {
        this._disabled = coerceBooleanProperty(value);

        // Browsers may not fire the blur event if the input is disabled too quickly.
        // Reset from here to ensure that the element doesn't become stuck.
        if (this.focused) {
            this.focused = false;
            this.stateChanges.next();
        }
    }
    protected _disabled = false;
    @HostBinding('attr.aria-describedby') public describedBy = '';
    public controlType = 'app-editor';
    public onContainerClick(): void {
        this._editor.setFocus();
    }

    constructor(
        @Self() private _editor: DejaEditorComponent,
        @Optional()
        @Self()
        public ngControl: NgControl,
        @Optional() _parentForm: NgForm,
        @Optional() _parentFormGroup: FormGroupDirective,
        _defaultErrorStateMatcher: ErrorStateMatcher
    ) {
        super(
            _defaultErrorStateMatcher,
            _parentForm,
            _parentFormGroup,
            ngControl
        );
    }

    public setDescribedByIds(ids: string[]): void {
        this.describedBy = ids.join(' ');
    }

    public ngOnInit() {
        this._editor.focus.subscribe(() => {
            this.focused = true;
            this.stateChanges.next();
        });

        this._editor.blur.subscribe(() => {
            this.focused = false;
            this.stateChanges.next();
        });
        this._editor.change.subscribe(() => {
            this.stateChanges.next();
        });
    }

    public ngDoCheck() {
        if (this.ngControl) {
            this.updateErrorState();
        }
    }

    public ngOnDestroy(): void {
        this.stateChanges.complete();
    }

    public get empty(): boolean {
        return !this._editor.value;
    }

    get shouldLabelFloat(): boolean {
        return this.focused || !this.empty;
    }
}
