import * as angular from 'angular';

angular.module('emuwebApp')
	.directive('emuwebapp', function (ViewStateService, ConfigProviderService) {
		return {
			template: `
			<div ng-controller="EmuWebAppController" class="emuwebapp-main" id="MainCtrl" handleglobalkeystrokes>
				<!-- start: modal -->
				<modal></modal>
				<!-- end: modal -->
				<!-- start: hint -->
				<hint ng-if="internalVars.showAboutHint"></hint>
				<!-- end: hint -->
				<!-- start: left side menu bar -->
				<bundle-list-side-bar ng-show="vs.bundleListSideBarOpen"></bundle-list-side-bar>
				<!-- end: left side menu bar -->

				<!-- start: main window -->
				<div class="emuwebapp-window" id="mainWindow">
					<progress-thing show-thing="{{vs.somethingInProgress}}"></progress-thing>
					<div class="printTitle">EMU-webApp : {{lmds.getCurBndlName()}}</div>

					<!-- start: top menu bar -->
					<div class="emuwebapp-top-menu">
						<button ng-show="cps.vals.activeButtons.openMenu" id="bundleListSideBarOpen" ng-click="vs.toggleBundleListSideBar(cps.design.animation.period);" class="emuwebapp-button-icon" style="float:left"><img src="img/menu.svg" class="_20px" /></button>
						<button ng-show="cps.vals.activeButtons.addLevelSeg" ng-disabled="!vs.getPermission('addLevelSegBtnClick')" class="emuwebapp-mini-btn left" ng-click="addLevelSegBtnClick();">add level (SEG.)</button>
						<button ng-show="cps.vals.activeButtons.addLevelEvent" ng-disabled="!vs.getPermission('addLevelPointBtnClick')" class="emuwebapp-mini-btn left" ng-click="addLevelPointBtnClick();">add level (EVENT)</button>
						<button ng-show="cps.vals.activeButtons.renameSelLevel" ng-disabled="!vs.getPermission('renameSelLevelBtnClick')" class="emuwebapp-mini-btn left" ng-click="renameSelLevelBtnClick();">rename sel. level</button>
						<button id="downloadTextgrid" ng-show="cps.vals.activeButtons.downloadTextGrid" ng-disabled="!vs.getPermission('downloadTextGridBtnClick')" class="emuwebapp-mini-btn left" ng-click="downloadTextGridBtnClick();">download TextGrid</button>
						<button id="downloadAnnotation" ng-show="cps.vals.activeButtons.downloadAnnotation" ng-disabled="!vs.getPermission('downloadAnnotationBtnClick')" class="emuwebapp-mini-btn left" ng-click="downloadAnnotationBtnClick();">download annotJSON</button>
						<button id="spectSettingsBtn" ng-show="cps.vals.activeButtons.specSettings" ng-disabled="!vs.getPermission('spectSettingsChange')" class="emuwebapp-mini-btn left" ng-click="spectSettingsBtnClick();">OSCI/SPEC settings</button>
						<div class="emuwebapp-nav-wrap" ng-show="cps.vals.activeButtons.openDemoDB">
							<ul class="emuwebapp-dropdown-container">
								<li class="left">
									<button id="demoDB" type="button" ng-mouseover="dropdown = true" ng-mouseleave="dropdown = false" ng-click="dropdown = !dropdown" class="emuwebapp-mini-btn full" ng-disabled="!vs.getPermission('openDemoBtnDBclick')">open demo <span id="emuwebapp-dropdown-arrow"></span></button>
									<ul class="emuwebapp-dropdown-menu" ng-mouseover="dropdown = true" ng-mouseleave="dropdown = false" ng-init="dropdown = false" ng-show="dropdown">
										<li class="divider"></li>
										<li ng-repeat="curDB in cps.vals.demoDBs" ng-click="openDemoDBbtnClick(curDB);" id="demo{{$index}}">{{curDB}}</li>
									</ul>
								</li>
							</ul>
						</div>
						<button ng-show="cps.vals.activeButtons.connect" ng-disabled="!vs.getPermission('connectBtnClick')" class="emuwebapp-mini-btn left" ng-click="connectBtnClick();">{{connectBtnLabel}}</button>
						<button id="showHierarchy" class="emuwebapp-mini-btn left" ng-click="showHierarchyBtnClick();" ng-disabled="!vs.getPermission('showHierarchyBtnClick')" ng-show="cps.vals.activeButtons.showHierarchy">show hierarchy</button>
						<button id="showeditDB" class="emuwebapp-mini-btn left" ng-click="showEditDBconfigBtnClick();" ng-disabled="!vs.getPermission('editDBconfigBtnClick')" ng-show="cps.vals.activeButtons.editEMUwebAppConfig">edit config</button>
						<button ng-show="cps.vals.activeButtons.search" ng-disabled="!vs.getPermission('searchBtnClick')" class="emuwebapp-mini-btn left" ng-click="searchBtnClick();">search</button>
						<button ng-show="cps.vals.activeButtons.clear" id="clear" ng-disabled="!vs.getPermission('clearBtnClick')" class="emuwebapp-mini-btn left" ng-click="clearBtnClick();">clear</button>
						<button id="aboutBtn" class="emuwebapp-button-icon" style="float: right;" ng-click="aboutBtnClick();"><img src="assets/EMU-webAppEmu.svg" class="_35px" /></button>
					</div>
					<!-- top menu bar end -->

					<!-- vertical split layout that contains top and bottom pane -->
					<div class="emuwebapp-canvas">
						<bg-splitter show-two-dim-cans="{{cps.vals.perspectives[vs.curPerspectiveIdx].twoDimCanvases.order.length > 0}}">
							<bg-pane type="topPane" min-size="80" max-size="500">
								<ul class="emuwebapp-timeline-flexcontainer">
									<li class="emuwebapp-timeline-flexitem" ng-style="{'height': getEnlarge($index)}" ng-repeat="curTrack in cps.vals.perspectives[vs.curPerspectiveIdx].signalCanvases.order track by $index" ng-switch on="curTrack">
										<osci 
										ng-switch-when="OSCI" 
										order="{{$index}}" 
										track-name="{{curTrack}}"
										></osci>
										
										<spectro 
										ng-switch-when="SPEC" 
										order="{{$index}}" 
										track-name="{{curTrack}}"
										></spectro>
										
										<ssff-track 
										ng-switch-default 
										order="{{$index}}" 
										track-name="{{curTrack}}"
										></ssff-track>
									</li>
								</ul>
							</bg-pane>
							<bg-pane type="bottomPane" min-size="80">
								<!-- ghost level div containing ul of ghost levels-->
								<div ng-if="cps.vals.perspectives[vs.curPerspectiveIdx].hierarchyPathCanvases" style="margin-top: 25px;">
									<ul>
										<li ng-repeat="canvasDef in cps.vals.perspectives[vs.curPerspectiveIdx].hierarchyPathCanvases.order">
											<hierarchy-path-canvas 
											annotation="dataServ.getData()" 
											path="canvasDef.path"
											view-port-sample-start="vs.curViewPort.sS"
											view-port-sample-end="vs.curViewPort.eS"
											view-port-select-start="vs.curViewPort.selectS"
											view-port-select-end="vs.curViewPort.selectE"
											cur-mouse-x="vs.curMouseX"
											cur-click-level-name="vs.curClickLevelName"
											moving-boundary-sample="vs.movingBoundarySample"
											moving-boundary="vs.movingBoundary",
											moves-away-from-last-save="hists.movesAwayFromLastSave"
											cur-perspective-idx="vs.curPerspectiveIdx"
											cur-bndl="lmds.getCurBndl()"
											></hierarchy-path-canvas>
										</li>
									</ul>
								</div>
								<!-- level div containing ul of levels -->
								<div ng-if="true" style="margin-top: 25px;">
									<ul>
										<li ng-repeat="levelName in cps.vals.perspectives[vs.curPerspectiveIdx].levelCanvases.order">
											<level 
											ng-if="levServ.getLevelDetails(levelName)"
											level="levServ.getLevelDetails(levelName)" 
											idx="$index" 
											view-port-sample-start="vs.curViewPort.sS"
											view-port-sample-end="vs.curViewPort.eS"
											view-port-select-start="vs.curViewPort.selectS"
											view-port-select-end="vs.curViewPort.selectE"
											cur-mouse-x="vs.curMouseX"
											cur-click-level-name="vs.curClickLevelName"
											moving-boundary-sample="vs.movingBoundarySample"
											moving-boundary="vs.movingBoundary",
											moves-away-from-last-save="hists.movesAwayFromLastSave"
											cur-perspective-idx="vs.curPerspectiveIdx"
											cur-bndl="lmds.getCurBndl()"
											></level>
										</li>
									</ul>
								</div>
							</bg-pane>
							<bg-pane type="emuwebapp-2d-map">
								<ul>
									<li ng-repeat="cur2dTrack in cps.vals.perspectives[vs.curPerspectiveIdx].twoDimCanvases.order" ng-switch on="cur2dTrack">
										<epg ng-switch-when="EPG"></epg>
										<dots ng-switch-when="DOTS"></dots>
									</li>
								</ul>
							</bg-pane>
						</bg-splitter>
						<history-action-popup></history-action-popup>
					</div>
					<!-- end: vertical split layout -->

					<!-- start: bottom menu bar -->
					<div class="emuwebapp-bottom-menu">
						<div>
							<preview id="preview" class="preview" current-bundle-name="{{getCurBndlName()}}"></preview>
						</div>
						<button id="zoomAllBtn" ng-click="cmdZoomAll();" ng-disabled="!vs.getPermission('zoom')" class="emuwebapp-mini-btn left">all</button>
						<button id="zoomInBtn" ng-click="cmdZoomIn();" ng-disabled="!vs.getPermission('zoom')" class="emuwebapp-mini-btn left">in</button>
						<button id="zoomOutBtn" ng-click="cmdZoomOut();" ng-disabled="!vs.getPermission('zoom')" class="emuwebapp-mini-btn left">out</button>
						<button id="zoomLeftBtn" ng-click="cmdZoomLeft();" ng-disabled="!vs.getPermission('zoom')" class="emuwebapp-mini-btn left">left</button>
						<button id="zoomRightBtn" ng-click="cmdZoomRight();" ng-disabled="!vs.getPermission('zoom')" class="emuwebapp-mini-btn left">right</button>
						<button id="zoomSelBtn" ng-click="cmdZoomSel();" ng-disabled="!vs.getPermission('zoom')" class="emuwebapp-mini-btn left">selection</button>
						<button id="playViewBtn" ng-show="cps.vals.restrictions.playback" ng-click="cmdPlayView();" ng-disabled="!vs.getPermission('playaudio')" class="emuwebapp-mini-btn left">play in view</button>
						<button id="playSelBtn" ng-show="cps.vals.restrictions.playback" ng-click="cmdPlaySel();" ng-disabled="!vs.getPermission('playaudio')" class="emuwebapp-mini-btn left">play selected</button>
						<button id="playAllBtn" ng-show="cps.vals.restrictions.playback" ng-click="cmdPlayAll();" ng-disabled="!vs.getPermission('playaudio')" class="emuwebapp-mini-btn left">play entire file</button>
					</div>
					<!-- end: bottom menu bar -->

					<!-- start: large text input field -->
					<!--<large-text-field-input></large-text-field-input>-->

					<!-- start: perspectives menu bar (right) -->
					<perspectives></perspectives>
					<!-- end: perspectives menu bar (right) -->
				</div>
				<!-- end: main window -->
			</div>
			<!-- end: container EMU-webApp -->
			`,
			restrict: 'E',
			scope: {
				audioGetUrl: '@',
				labelGetUrl: '@',
				labelType: '@'
			},
			link: function postLink(scope, element, attrs) {

				////////////////////////
				// Bindings
				element.bind('mouseenter', function () {
					ViewStateService.mouseInEmuWebApp = true;

				});

				element.bind('mouseleave', function () {
					ViewStateService.mouseInEmuWebApp = false;
				});

				///////////////////////
				// observe attrs

				attrs.$observe('audioGetUrl', function (val) {
					if (val !== undefined && val !== '') {
						ConfigProviderService.embeddedVals.audioGetUrl = val;
					}
				});

				attrs.$observe('labelGetUrl', function (val) {
					if (val !== undefined && val !== '') {
						ConfigProviderService.embeddedVals.labelGetUrl = val;
					}
				});

				attrs.$observe('labelType', function (val) {
					if (val !== undefined && val !== '') {
						ConfigProviderService.embeddedVals.labelType = val;
					}
				});
			}
		};
	});