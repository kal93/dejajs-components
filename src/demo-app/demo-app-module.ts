/*
 * *
 *  @license
 *  Copyright Hôpitaux Universitaires de Genève All Rights Reserved.
 *
 *  Use of this source code is governed by an Apache-2.0 license that can be
 *  found in the LICENSE file at https://github.com/DSI-HUG/dejajs-components/blob/master/LICENSE
 * /
 *
 */

import { ApplicationRef, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { MaterialModule } from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { GroupingModule } from '../common/core/grouping/index';
import { DejaSortingModule } from '../common/core/sorting/index';
import { MaterialColors } from '../common/core/style/index';
import { GlobalEventService } from '../common/global-event/global-event.service';
import {
    DejaAccordionModule,
    DejaAutosizeTextAreaModule,
    DejaBackdropModule,
    DejaBoldQueryModule,
    DejaCircularPickerModule,
    DejaCodeViewerModule,
    DejaColorPickerModule,
    DejaColorSelectorModule,
    DejaDatePickerModule,
    DejaDateSelectorModule,
    DejaDialogModule,
    DejaDragDropModule,
    DejaMouseDragDropModule,
    DejaEditableModule,
    DejaGridModule,
    DejaMarkdownModule,
    DejaMenuModule,
    DejaMessageBoxModule,
    DejaMonacoEditorModule,
    DejaRangeModule,
    DejaSelectModule,
    DejaSnackbarModule,
    DejaSplitterModule,
    DejaTilesModule,
    DejaTooltipModule,
    DejaTreeListModule,
    /* deja-cli import module */
    /* The comment above mustn't be removed ! */
} from '../component';
import { DejaAccordionDemo } from './accordion/accordion-demo';
import { DejaCircularPickerDemo } from './circular-picker/circular-picker-demo';
import { DejaColorSelectorDemo } from './color-selector/color-selector-demo';
import { DejaContentEditableDemo } from './content-editable/content-editable-demo';
import { DejaDatePickerDemo } from './date-picker/date-picker-demo';
import { DemoAppComponent } from './demo-app/demo-app';
import { Home } from './demo-app/home-app';
import { routing } from './demo-app/routes';
import { GlobalEventsDemo } from './global-events/global-events-demo';
import { GridDemo } from './grid/grid-demo';
import { MenuDemo } from './menu/menu-demo';
import { MessageBoxDemo } from './message-box/message-box-demo';
import { DejaMonacoEditorDemo } from './monaco-editor/monaco-editor-demo';
import { MonacoEditorDemoService } from './monaco-editor/monaco-editor-demo.service.';
import { MonacoEditorJsonFileResolver, MonacoEditorJsonToCompareFileResolver, MonacoEditorXmlFileResolver, MonacoEditorXmlToCompareFileResolver } from './monaco-editor/monaco-editor.resolver';
import { ProgressCircleDemo } from './progress-circle/progress-circle-demo';
import { DejaRangeDemo } from './range/range-demo';
import { SelectDemo } from './select/select-demo';
import { CountriesListService } from './services/countries-list.service';
import { CountriesService } from './services/countries.service';
import { DrugsService } from './services/drugs.service';
import { DejaSnackbarDemo } from './snackbar/snackbar-demo';
import { DejaSplitterDemo } from './splitter/splitter-demo';
import { TextAreaDemo } from './textarea/textarea-demo';
import { TilesDemoComponent } from './tiles/tiles-demo';
import { DejaTreeListDemo } from './tree-list/tree-list-demo';
import { DejaClipboardService } from '../common/core/clipboard/clipboard.service';

/* deja-cli import demo */
/* The comment above mustn't be removed ! */

import { CodeblockModule } from 'ng-prism';

@NgModule({
    declarations: [
        DejaAccordionDemo,
        DejaContentEditableDemo,
        DejaCircularPickerDemo,
        DejaDatePickerDemo,
        DejaColorSelectorDemo,
        DemoAppComponent,
        GlobalEventsDemo,
        GridDemo,
        Home,
        MenuDemo,
        MessageBoxDemo,
        SelectDemo,
        TilesDemoComponent,
        TextAreaDemo,
        DejaTreeListDemo,
        DejaMonacoEditorDemo,
        DejaSnackbarDemo,
        DejaRangeDemo,
        DejaSplitterDemo,
        ProgressCircleDemo,
        /* deja-cli declarations demo */
        /* The comment above mustn't be removed ! */
    ],
    entryComponents: [
        DemoAppComponent,
    ],
    imports: [
        DejaAccordionModule,
        BrowserModule,
        DejaCodeViewerModule,
        CodeblockModule,
        DejaCircularPickerModule,
        DejaDateSelectorModule,
        DejaDatePickerModule,
        DejaDialogModule,
        FormsModule,
        HttpModule,
        RouterModule,
        MaterialModule,
        DejaSelectModule,
        DejaTreeListModule,
        DejaTilesModule,
        DejaColorSelectorModule,
        DejaColorPickerModule,
        DejaBoldQueryModule,
        DejaMarkdownModule,
        DejaMenuModule,
        DejaMessageBoxModule,
        DejaEditableModule,
        DejaDragDropModule,
        DejaMouseDragDropModule.forRoot(),
        DejaBackdropModule,
        DejaGridModule,
        DejaSortingModule,
        DejaAutosizeTextAreaModule,
        DejaMonacoEditorModule,
        DejaSnackbarModule,
        DejaRangeModule,
        DejaSplitterModule,
        DejaTooltipModule,
        /* deja-cli imports module */
        /* The comment above mustn't be removed ! */
        routing,
        GroupingModule,
    ],
    providers: [
        DejaClipboardService,
        CountriesService,
        CountriesListService,
        GlobalEventService,
        MaterialColors,
        DrugsService,
        // Monaco Editor Resolver Route
        MonacoEditorXmlFileResolver,
        MonacoEditorXmlToCompareFileResolver,
        MonacoEditorJsonFileResolver,
        MonacoEditorJsonToCompareFileResolver,
        MonacoEditorDemoService,
    ],
})
export class DemoAppModule {
    constructor(private appRef: ApplicationRef) { }

    protected ngDoBootstrap() {
        this.appRef.bootstrap(DemoAppComponent);
    }
}
