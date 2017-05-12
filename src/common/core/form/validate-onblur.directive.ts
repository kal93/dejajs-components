/*
 *  @license
 *  Copyright Hôpitaux Universitaires de Genève. All Rights Reserved.
 *
 *  Use of this source code is governed by an Apache-2.0 license that can be
 *  found in the LICENSE file at https://github.com/DSI-HUG/dejajs-components/blob/master/LICENSE
 */

import { Directive, HostListener } from '@angular/core';
import { AsyncValidatorFn, NgControl, ValidatorFn } from '@angular/forms';

@Directive({
    selector: '[validate-onblur]',
})
export class ValidateOnBlurDirective {
    private validators: ValidatorFn;
    private asyncValidators: AsyncValidatorFn;
    private hasFocus = false;

    constructor(public formControl: NgControl) {

    }

    @HostListener('focus')
    protected onFocus() {
        this.hasFocus = true;
        this.validators = this.formControl.control.validator;
        this.asyncValidators = this.formControl.control.asyncValidator;
        this.formControl.control.clearAsyncValidators();
        this.formControl.control.clearValidators();
        this.formControl.control.valueChanges
            .filter(() => this.hasFocus)
            .subscribe(() => this.formControl.control.markAsPending());
    }

    @HostListener('blur')
    protected onBlur() {
        this.hasFocus = false;
        this.formControl.control.setAsyncValidators(this.asyncValidators);
        this.formControl.control.setValidators(this.validators);
        this.formControl.control.updateValueAndValidity();
    }
}
