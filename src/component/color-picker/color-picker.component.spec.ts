/*
 *  @license
 *  Copyright Hôpitaux Universitaires de Genève. All Rights Reserved.
 *
 *  Use of this source code is governed by an Apache-2.0 license that can be
 *  found in the LICENSE file at https://github.com/DSI-HUG/dejajs-components/blob/master/LICENSE
 */

import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Color } from '../../common/core/graphics/color';
import { MaterialColors } from '../../common/core/style/material-colors';
import { DejaColorSelectorModule } from '../index';
import { DejaOverlayModule } from '../overlay/index';
import { DejaColorPickerComponent } from './color-picker.component';

describe('DejaColorPicker', () => {

    let component: DejaColorPickerComponent;
    let fixture: ComponentFixture<DejaColorPickerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                DejaColorPickerComponent
            ],
            imports: [
                DejaColorSelectorModule,
                FormsModule,
                DejaOverlayModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DejaColorPickerComponent);
        component = fixture.componentInstance;
    }));

    it('should create the component', async(() => {
        expect(component).toBeTruthy();
    }));

    it('should have background-color null if no value specified', () => {
        component.colors = new MaterialColors().colors;
        fixture.detectChanges();

        const el = fixture.debugElement.query(By.css('button'));
        expect(el.styles['background-color']).toBeNull();
    });

    it('should have background-color if value specified', () => {
        component.colors = new MaterialColors().colors;
        component.value = Color.fromHex('#FFA012');
        fixture.detectChanges();

        const el = fixture.debugElement.query(By.css('button'));
        expect(el.styles['background-color']).toEqual('#FFA012');
    });

    it('should set isOpen to true on show', () => {
        component.isOpen = false;
        component.show(null);

        expect(component.isOpen).toBeTruthy();
    });

    it('should not set isOpen to true on show if component disabled', () => {
        component.isOpen = false;
        component.disabled = true;
        component.show(null);

        expect(component.isOpen).toBeFalsy();
    });

    it('shoud set isOpen to true on close', () => {
        component.isOpen = true;
        component.close();

        expect(component.isOpen).toBeFalsy();
    });

    it('should set isOpen to false and set value on onColorChange', () => {
        component.isOpen = true;
        component.value = new Color(100, 100, 100, undefined);
        component.onColorChange(Color.fromHex('#00FFFF'));

        const expectedColor: Color = new Color(0, 255, 255, undefined);

        expect(component.isOpen).toBeFalsy();
        expect(component.value).toEqual(expectedColor);
    });
});
