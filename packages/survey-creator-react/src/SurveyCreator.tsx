import React from "react";
import { CSSProperties } from "react";

import {
  Base,
  Question,
  PanelModel,
  StylesManager,
  SurveyError,
  unwrap,
  SurveyModel,
  SurveyElement,
  ItemValue,
  QuestionSelectBase
} from "survey-core";
import {
  SurveyActionBar,
  ReactElementFactory,
  ReactQuestionFactory,
  Model,
  SurveyElementBase,
  SurveyLocStringViewer
} from "survey-react-ui";
import { ICreatorOptions, CreatorBase, ITabbedMenuItem } from "@survey/creator";
import TabbedMenuComponent from "./TabbedMenuComponent";
import { editableStringRendererName } from "./components/StringEditor";

StylesManager.applyTheme("modern");

interface ISurveyCreatorComponentProps {
  creator: SurveyCreator;
}

export class SurveyCreatorComponent extends SurveyElementBase<
  ISurveyCreatorComponentProps,
  any
> {
  constructor(props: ISurveyCreatorComponentProps) {
    super(props);
  }
  get creator(): CreatorBase<SurveyModel> {
    return this.props.creator;
  }
  protected getStateElement(): Base {
    return this.props.creator;
  }

  render() {
    const creator: CreatorBase<SurveyModel> = this.props.creator;
    //AM: width unrecognized by react
    return (
      <div className="svc-creator">
        <div className="svc-creator__area svc-flex-column">
          <div className="svc-top-bar">
            <TabbedMenuComponent items={creator.tabs}></TabbedMenuComponent>
            <SurveyActionBar items={creator.toolbarItems}></SurveyActionBar>
          </div>
          <div className="svc-creator__content-wrapper svc-flex-row">
            <div className="svc-creator__content-holder svc-flex-column">
              {this.renderCreatorTabs()}
            </div>
          </div>
        </div>
      </div>
    );
  }
  renderCreatorTabs() {
    const creator: CreatorBase<SurveyModel> = this.props.creator;
    var tabs = creator.tabs.map((tab, index) => {
      return this.renderCreatorTab(tab);
    });
    return <>{tabs}</>;
    //return <Survey.Survey model={this.creator.survey} />;
  }
  renderCreatorTab(tab: ITabbedMenuItem) {
    const creator: CreatorBase<SurveyModel> = this.props.creator;
    let style: CSSProperties = {};
    //if (tab.visible !== undefined && !tab.visible) {
    if (!unwrap(tab.active)) {
      style.display = "none";
    }

    const component = ReactElementFactory.Instance.createElement(
      tab.componentContent,
      { creator: creator, survey: creator.survey, data: tab.data }
    );
    return (
      <div key={tab.id} className="svc-creator-tab" style={style}>
        {component}
      </div>
    );
    /*
      <div
        class="svc-creator-tab"
        data-bind="visible: $parent.creator.viewType == id"
      >
        <!-- ko component: { name: template, params: {creator: $parent.creator, survey: $parent.creator.survey, data: data } } -->
        <!-- /ko -->
      </div>
    */
  }
}

class DesignTimeSurveyModel extends Model {
  constructor(public creator: SurveyCreator, jsonObj?: any) {
    super(jsonObj);
  }
  public get hasLogo(): boolean {
    return true;
  }
  public get isLogoBefore(): boolean {
    return false;
  }
  public get isLogoAfter(): boolean {
    return true;
  }
  public getElementWrapperComponentName(element: SurveyElement): string {
    if (element instanceof Question) {
      if (element.getType() == "dropdown") {
        return "svc-dropdown-question";
      }
      if (element.getType() == "image") {
        return "svc-image-question";
      }
      return "svc-question";
    }
    if (element instanceof PanelModel) {
      return "svc-question";
    }
    return super.getElementWrapperComponentName(element);
  }
  public getElementWrapperComponentNameByName(element: string): string {
    if (element === "sv-logo-image") return "svc-logo-image";
    return super.getElementWrapperComponentNameByName(element);
  }
  public getElementWrapperComponentData(element: SurveyElement): any {
    if (element instanceof Question) {
      return this.creator;
    }
    if (element instanceof PanelModel) {
      return this.creator;
    }
    return super.getElementWrapperComponentData(element);
  }
  public getElementWrapperComponentDataByName(element: string): any {
    if (element === "sv-logo-image") return this.creator;
    return super.getElementWrapperComponentDataByName(element);
  }
  public getItemValueWrapperComponentName(item: ItemValue, question: QuestionSelectBase): string {
    if (question.getType() === "imagepicker") {
      return "svc-image-item-value";
    }
    return "svc-item-value";
  }
  public getItemValueWrapperComponentData(item: ItemValue, question: QuestionSelectBase): any {
    return {
      creator: this.creator,
      question
    };
  }
  public getRendererForString(element: Base, name: string): string {
    return editableStringRendererName;
  }
}
class SurveyCreator extends CreatorBase<SurveyModel> {
  constructor(options: ICreatorOptions = {}) {
    super(options);
  }
  protected createSurveyCore(json: any = {}, reason: string): Model {
    if (reason === "designer") return new DesignTimeSurveyModel(this, json);
    return new Model(json);
  }
  //ISurveyCreator
  public createQuestionElement(question: Question): JSX.Element {
    return ReactQuestionFactory.Instance.createQuestion(
      question.isDefaultRendering()
        ? question.getTemplate()
        : question.getComponentName(),
      {
        question: question,
        isDisplayMode: question.isReadOnly,
        creator: this,
      }
    );
  }
  public renderError(
    key: string,
    error: SurveyError,
    cssClasses: any
  ): JSX.Element {
    return (
      <div key={key}>
        <span className={cssClasses.error.icon} aria-hidden="true" />
        <span className={cssClasses.error.item}>
          <SurveyLocStringViewer locStr={error.locText} />
        </span>
      </div>
    );
  }
  public questionTitleLocation(): string {
    return this.survey.questionTitleLocation;
  }
  public questionErrorLocation(): string {
    return this.survey.questionErrorLocation;
  }
}

export function createReactSurveyCreator(json: any, options: any = null) {
  if (!options) options = {};
  const creator = new SurveyCreator(options);
  creator.JSON = json;
  //creator.setSurvey(new Model(json));
  return creator;
}
