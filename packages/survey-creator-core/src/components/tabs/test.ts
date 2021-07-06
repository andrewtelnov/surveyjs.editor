import { simulatorDevices, SimulatorOptions } from "../simulator";

import "./test.scss";
import { surveyLocalization, IActionBarItem, PopupModel, ListModel, Base, propertyArray, property, PageModel, SurveyModel, Action, AdaptiveActionContainer } from "survey-core";
import { CreatorBase, ICreatorPlugin } from "../../creator-base";
import { editorLocalization, getLocString } from "../../editorLocalization";

// import template from "./test.html";

// export * from "@survey/creator/components/toolbar";
// export * from "@survey/creator/components/simulator";
// export * from "@survey/creator/components/results";
// export * from "@survey/creator/utils/dropdown";
// export * from "@survey/creator/utils/boolean";
// export * from "@survey/creator/utils/svg-icon";
// export * from "@survey/creator/utils/survey-widget";
// export { SurveySimulatorComponent as SurveySimulatorComponentV1 } from "@survey/creator/components/simulator";
// export { SurveyResultsModel as SurveyResultsModelV1 } from "@survey/creator/components/results";

export class TestSurveyTabViewModel extends Base {
  private json: any;
  public toolbar: AdaptiveActionContainer = new AdaptiveActionContainer();
  private deviceSelectorAction: Action;
  private prevPageAction: Action;
  private nextPageAction: Action;
  private selectPageAction: Action;
  private languageSelectorAction: Action;
  private testAgainAction: Action;
  private invisibleToggleAction: Action;

  @property({ defaultValue: true }) isRunning: boolean;
  @property({
    defaultValue: "desktop",
    onSet: (val: string, target: TestSurveyTabViewModel) => {
      if (!!val) {
        target.simulator.device = val;
      }
    }
  })
  device: string;
  @property({
    onSet: (val: SurveyModel, target: TestSurveyTabViewModel) => {
      if (!!val) {
        target.simulator.survey = val;
      }
    }
  })
  survey: SurveyModel;
  @propertyArray() pages: Array<IActionBarItem>;
  @property({
    onSet: (val: PageModel, target: TestSurveyTabViewModel) => {
      if (!!val) {
        if (target.survey.state == "starting") {
          target.survey.start();
        }
        target.survey.currentPage = val;
      }
    }
  })
  activePage: PageModel;
  @propertyArray() languages: Array<IActionBarItem>;
  @property({
    defaultValue: "",
    onSet: (val: string, target: TestSurveyTabViewModel) => {
      if (target.survey.locale == val) return;
      target.survey.locale = val;
    }
  })
  public get activeLanguage(): string {
    return this.getPropertyValue("activeLanguage", this.survey.locale || surveyLocalization.defaultLocale);
  }
  public set activeLanguage(val: string) {
    if (val === this.activeLanguage) return;
    this.setPropertyValue("activeLanguage", val);
    this.survey.locale = val;
  }

  @property({
    defaultValue: false,
    onSet: (val: boolean, target: TestSurveyTabViewModel) => {
      target.survey.showInvisibleElements = val;
    }
  })
  showInvisibleElements;
  @property({ defaultValue: true }) showPagesInTestSurveyTab;
  @property({ defaultValue: true }) showSimulator;
  @property({ defaultValue: true }) showDefaultLanguageInTestSurveyTab;
  @property({ defaultValue: true }) showInvisibleElementsInTestSurveyTab;
  public simulator: SimulatorOptions;
  private pagePopupModel: PopupModel;
  /**
   * The list of action bar items.
   * @see IActionBarItem
   */
  public get actions(): Array<Action> {
    return this.toolbar.actions;
  }

  onSurveyCreatedCallback: (survey: SurveyModel) => any;
  constructor(private surveyProvider: CreatorBase<SurveyModel>) {
    super();
    this.simulator = new SimulatorOptions();
  }

  public setJSON(json: any) {
    this.json = json;
    if (json != null) {
      if (json.cookieName) {
        delete json.cookieName;
      }
    }
    this.survey = this.surveyProvider.createSurvey(json || {}, "test");
    if (this.onSurveyCreatedCallback) this.onSurveyCreatedCallback(this.survey);
    const self: TestSurveyTabViewModel = this;
    this.survey.onComplete.add((sender: SurveyModel) => {
      self.isRunning = false;
    });
    if (!!this.survey["onNavigateToUrl"]) {
      this.survey["onNavigateToUrl"].add(function (sender, options) {
        const url: string = options.url;
        options.url = "";
        if (!!url) {
          const message: string = self.getLocString("ed.navigateToMsg") + " '" + url + "'.";
          if (!!this.surveyProvider) {
            this.surveyProvider.notify(message);
          } else {
            alert(message);
          }
        }
      });
    }
    this.survey.onStarted.add((sender: SurveyModel) => {
      self.setActivePageItem(self.survey.currentPage, true);
    });
    this.survey.onCurrentPageChanged.add((sender: SurveyModel, options) => {
      self.activePage = options.newCurrentPage;
      self.setActivePageItem(options.oldCurrentPage, false);
      self.setActivePageItem(options.newCurrentPage, true);
    });
    this.survey.onPageVisibleChanged.add((sender: SurveyModel, options) => {
      self.updatePageItem(options.page);
    });
  }
  private updatePageItem(page: PageModel) {
    const item = this.getPageItemByPage(page);
    if (item) {
      item.visible = page.isVisible;
      item.enabled = page.isVisible;
    }
  }
  public show(options: any = null) {
    const pages: Array<IActionBarItem> = [];
    for (let i: number = 0; i < this.survey.pages.length; i++) {
      const page: PageModel = this.survey.pages[i];
      pages.push({
        id: page.name,
        data: page,
        title: this.surveyProvider.getObjectDisplayName(page, "survey-tester"),
        visible: page.isVisible,
        enabled: page.isVisible,
        active: () => this.survey.state === "running" && page === this.survey.currentPage
      });
    }
    if (!!options && options.showSimulatorInTestSurveyTab !== undefined) {
      this.showSimulator = options.showSimulatorInTestSurveyTab;
    }
    if (!!options && options.showPagesInTestSurveyTab !== undefined) {
      this.showPagesInTestSurveyTab = options.showPagesInTestSurveyTab;
    }
    if (!!options && options.showDefaultLanguageInTestSurveyTab != undefined) {
      this.setDefaultLanguageOption(options.showDefaultLanguageInTestSurveyTab);
    }
    if (!!options && options.showInvisibleElementsInTestSurveyTab !== undefined) {
      this.showInvisibleElementsInTestSurveyTab = options.showInvisibleElementsInTestSurveyTab;
    }
    this.showInvisibleElements = false;
    this.pages = pages;
    this.activePage = this.survey.currentPage;
    this.buildActions();
    this.isRunning = true;
  }
  public getLocString(name: string) {
    return editorLocalization.getString(name);
  }
  public get testSurveyAgainText() {
    return this.getLocString("ed.testSurveyAgain");
  }
  public get localeText() {
    return this.getLocString("pe.locale");
  }
  private testAgain() {
    this.setJSON(this.json);
    this.show();
  }
  private setDefaultLanguageOption(opt: boolean | string) {
    const vis: boolean = opt === true || opt === "all" || (opt === "auto" && this.survey.getUsedLocales().length > 1);
    this.showDefaultLanguageInTestSurveyTab = vis;
    if (vis) {
      this.languages = this.getLanguages(opt !== "all" ? this.survey.getUsedLocales() : null);
    }
  }
  public buildActions() {
    const languagePopupModel: PopupModel = new PopupModel(
      "sv-list",
      {
        model: new ListModel(
          this.languages,
          (item: any) => {
            this.activeLanguage = item.id;
            languagePopupModel.toggleVisibility();
          },
          true
        )
      },
      "top",
      "right"
    );

    const deviceSelectorItems = Object.keys(simulatorDevices)
      .filter((key) => !!simulatorDevices[key].title)
      .map((key) => ({ id: key, title: simulatorDevices[key].title }));
    const devicePopupModel: PopupModel = new PopupModel(
      "sv-list",
      {
        model: new ListModel(
          deviceSelectorItems,
          (item: any) => {
            this.device = item.id;
            devicePopupModel.toggleVisibility();
          },
          true
        )
      },
      "top",
      "right"
    );
    const actions: Array<Action> = [];
    this.deviceSelectorAction = new Action({
      id: "deviceSelector",
      css: "sv-action--first sv-action-bar-item--secondary",
      iconName: "icon-change_16x16",
      title: simulatorDevices[this.simulator.device].title || this.getLocString("pe.simulator"),
      enabled: this.showSimulator,
      component: "sv-action-bar-item-dropdown",
      action: () => {
        devicePopupModel.toggleVisibility();
      },
      popupModel: devicePopupModel
    });
    actions.push(this.deviceSelectorAction);

    const getCurrentPageItem: () => IActionBarItem = () => {
      const pageIndex: number = this.survey.pages.indexOf(this.survey.currentPage);
      return this.pages[pageIndex];
    };
    const pageList: ListModel = new ListModel(
      this.pages,
      (item: IActionBarItem) => {
        this.activePage = item.data;
        this.pagePopupModel.toggleVisibility();
      },
      true,
      getCurrentPageItem()
    );
    const setNearPage: (isNext: boolean) => void = (isNext: boolean) => {
      const currentIndex: number = this.survey.currentPageNo;
      const shift: number = isNext ? 1 : -1;
      const nearPage: PageModel = this.survey.visiblePages[currentIndex + shift];
      const pageIndex: number = this.survey.pages.indexOf(nearPage);
      this.activePage = this.survey.pages[pageIndex];
      pageList.selectedItem = this.pages[pageIndex];
    };
    this.pagePopupModel = new PopupModel("sv-list", { model: pageList }, "top", "center");

    this.registerFunctionsOnPropertiesChanged();

    this.prevPageAction = new Action({
      id: "prevPage",
      css: this.survey && !this.survey.isFirstPage ? "sv-action-bar-item--secondary" : "",
      iconName: "icon-leftarrow_16x16",
      visible: this.isRunning && this.pages.length > 1,
      enabled: this.survey && !this.survey.isFirstPage,
      title: "",
      action: () => setNearPage(false)
    });
    actions.push(this.prevPageAction);

    this.selectPageAction = new Action({
      id: "pageSelector",
      title: (this.activePage && this.surveyProvider.getObjectDisplayName(this.activePage, "survey-tester")) || this.getLocString("ts.selectPage"),
      visible: this.isRunning && this.pages.length > 1 && this.showPagesInTestSurveyTab,
      component: "sv-action-bar-item-dropdown",
      popupModel: this.pagePopupModel,
      action: (newPage) => {
        this.pagePopupModel.toggleVisibility();
      }
    });
    actions.push(this.selectPageAction);

    this.nextPageAction = new Action({
      id: "nextPage",
      css: this.survey && !this.survey.isLastPage ? "sv-action-bar-item--secondary" : "",
      iconName: "icon-rightarrow_16x16",
      visible: this.isRunning && this.pages.length > 1,
      enabled: this.survey && !this.survey.isLastPage,
      title: "",
      action: () => setNearPage(true)
    });
    actions.push(this.nextPageAction);

    this.languageSelectorAction = new Action({
      id: "languageSelector",
      css: "sv-action--last sv-action-bar-item--secondary",
      iconName: "icon-change_16x16",
      title: editorLocalization.getLocaleName(this.activeLanguage),
      visible: this.showDefaultLanguageInTestSurveyTab,
      component: "sv-action-bar-item-dropdown",
      action: () => {
        languagePopupModel.toggleVisibility();
      },
      popupModel: languagePopupModel
    });
    actions.push(this.languageSelectorAction);

    this.invisibleToggleAction = new Action({
      id: "showInvisible",
      css: this.showInvisibleElements ? "sv-action--last sv-action-bar-item--secondary" : "sv-action--last",
      visible: this.isRunning,
      title: this.getLocString("ts.showInvisibleElements"),
      iconName: this.showInvisibleElements ? "icon-switchactive_16x16" : "icon-switchinactive_16x16",
      action: () => (this.showInvisibleElements = !this.showInvisibleElements)
    });
    actions.push(this.invisibleToggleAction);

    this.testAgainAction = new Action({
      id: "testSurveyAgain",
      css: "sv-action--last",
      visible: !this.isRunning,
      title: this.testSurveyAgainText,
      action: () => {
        this.testAgain();
      }
    });
    actions.push(this.testAgainAction);

    this.toolbar.actions = actions;
  }
  private setActivePageItem(page: PageModel, val: boolean) {
    const item: IActionBarItem = this.getPageItemByPage(page);
    if (item) {
      item.active = val;
    }
  }
  private getPageItemByPage(page: PageModel): IActionBarItem {
    const items: IActionBarItem[] = this.pages;
    for (let i = 0; i < items.length; i++) {
      if (items[i].data === page) return items[i];
    }
    return null;
  }
  private getLanguages(usedLanguages: Array<string> = null): Array<IActionBarItem> {
    const res: Array<IActionBarItem> = [];
    const locales = !!usedLanguages && usedLanguages.length > 1 ? usedLanguages : surveyLocalization.getLocales();
    for (let i = 0; i < locales.length; i++) {
      const loc: string = locales[i];
      res.push({ id: loc, title: editorLocalization.getLocaleName(loc) });
    }
    return res;
  }

  private registerFunctionsOnPropertiesChanged() {
    this.simulator.registerFunctionOnPropertyValueChanged(
      "device",
      () => {
        this.deviceSelectorAction.title = simulatorDevices[this.simulator.device].title || this.getLocString("pe.simulator");
      },
      "testTabActions"
    );

    this.registerFunctionOnPropertiesValueChanged(
      ["isRunning", "pages", "activePage", "showPagesInTestSurveyTab", "activeLanguage", "showInvisibleElements"],
      () => {
        this.prevPageAction.css = this.survey && this.survey.visiblePages.indexOf(this.activePage) !== 0 ? "sv-action-bar-item--secondary" : "";
        this.prevPageAction.enabled = this.survey && this.survey.visiblePages.indexOf(this.activePage) !== 0;
        this.prevPageAction.visible = this.isRunning && this.pages.length > 1;

        this.nextPageAction.css = this.survey && this.survey.visiblePages.indexOf(this.activePage) !== this.survey.visiblePages.length - 1 ? "sv-action-bar-item--secondary" : "";
        this.nextPageAction.enabled = this.survey && this.survey.visiblePages.indexOf(this.activePage) !== this.survey.visiblePages.length - 1;
        this.nextPageAction.visible = this.isRunning && this.pages.length > 1;

        this.selectPageAction.title = (this.activePage && this.surveyProvider.getObjectDisplayName(this.activePage, "survey-tester")) || this.getLocString("ts.selectPage");
        this.selectPageAction.visible = this.isRunning && this.pages.length > 1 && this.showPagesInTestSurveyTab;

        this.languageSelectorAction.title = editorLocalization.getLocaleName(this.activeLanguage);

        this.invisibleToggleAction.css = this.showInvisibleElements ? "sv-action--last sv-action-bar-item--secondary" : "sv-action--last";
        this.invisibleToggleAction.visible = this.isRunning;
        this.invisibleToggleAction.iconName = this.showInvisibleElements ? "icon-switchactive_16x16" : "icon-switchinactive_16x16";

        this.testAgainAction.visible = !this.isRunning;
      },
      "testTabActions"
    );
  }

  public dispose() {
    this.unRegisterFunctionOnPropertiesValueChanged(["isRunning", "pages", "activePage", "showPagesInTestSurveyTab", "activeLanguage", "showInvisibleElements"], "testTabActions");
    this.simulator.unRegisterFunctionOnPropertyValueChanged("device", "testTabActions");
  }
}

export class TabTestPlugin implements ICreatorPlugin {
  public model: TestSurveyTabViewModel;
  private previewAction: Action;
  constructor(private creator: CreatorBase<SurveyModel>) {
    creator.addPluginTab("test", this, getLocString("ed.testSurvey"));
  }
  public activate(): void {
    this.model = new TestSurveyTabViewModel(this.creator);
    this.model.onSurveyCreatedCallback = (survey) => {
      this.creator["onTestSurveyCreated"] && this.creator["onTestSurveyCreated"].fire(self, { survey: survey });
    };
    this.previewAction.css = "sv-action-bar-item--secondary";
    const options = {
      showPagesInTestSurveyTab: this.creator.showPagesInTestSurveyTab,
      showDefaultLanguageInTestSurveyTab: this.creator.showDefaultLanguageInTestSurveyTab,
      showInvisibleElementsInTestSurveyTab: this.creator.showInvisibleElementsInTestSurveyTab,
      showSimulatorInTestSurveyTab: this.creator.showSimulatorInTestSurveyTab
    };
    this.model.setJSON(this.creator.JSON);
    this.model.show(options);
  }
  public deactivate(): boolean {
    this.previewAction.css = "";
    this.model.onSurveyCreatedCallback = undefined;
    this.model = undefined;
    return true;
  }
  public createActions(items: Array<Action>) {
    this.previewAction = new Action({
      id: "icon-preview",
      iconName: "icon-preview",
      needSeparator: true,
      css: this.creator.viewType === "test" ? "sv-action-bar-item--secondary" : "",
      action: () => {
        this.creator.makeNewViewActive("test");
      },
      active: false,
      title: "Preview"
    });
    items.push(this.previewAction);
  }
}
