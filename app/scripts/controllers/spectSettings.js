'use strict';

angular.module('emuwebApp')
	.controller('SpectsettingsCtrl', function ($scope, dialogService, viewState, Levelservice) {

		$scope.vs = viewState;

		$scope.options = Object.keys($scope.vs.getWindowFunctions());
		$scope.selWindowInfo = {};
		$scope.selWindowInfo.name = Object.keys($scope.vs.getWindowFunctions())[$scope.vs.spectroSettings.window - 1];

		// console.log(Object.keys($scope.vs.getWindowFunctions())[$scope.vs.spectroSettings.window - 1]);

		$scope.windowLengths = [32, 64, 128, 256, 512, 1024, 2048];

		$scope.modalVals = {
			'rangeFrom': $scope.vs.spectroSettings.rangeFrom,
			'rangeTo': $scope.vs.spectroSettings.rangeTo,
			'dynamicRange': $scope.vs.spectroSettings.dynamicRange,
			'windowLength': $scope.vs.spectroSettings.windowLength,
			'window': $scope.vs.spectroSettings.window
		};

		/**
		 *
		 */
		$scope.cursorInTextField = function () {
			viewState.focusInTextField = true;
		};

		/**
		 *
		 */
		$scope.cursorOutOfTextField = function () {
			viewState.focusInTextField = false;
		};

		/**
		 *
		 */
		$scope.saveSpectroSettings = function () {
		    if($scope.modalVals.dynamicRange % 1 === 0) {
		      if($scope.modalVals.rangeFrom % 1 === 0) {
		        if($scope.modalVals.rangeTo % 1 === 0) {
		          if($scope.modalVals.rangeFrom >= 0) {
		            if($scope.modalVals.rangeTo <= Levelservice.data.sampleRate/2) {
		                viewState.setspectroSettings($scope.modalVals.windowLength, $scope.modalVals.rangeFrom, $scope.modalVals.rangeTo, $scope.modalVals.dynamicRange, $scope.selWindowInfo.name);
		                $scope.cancel();
		            }
		            else {
		                $scope.error('View Range (Hz) upper boundary is a value bigger than ' + Levelservice.data.sampleRate/2);
		            }
		          }
		          else {
		            $scope.error('View Range (Hz) lower boundary is a value below zero');
		          }
		        }
		        else {
		          $scope.error('View Range (Hz) upper boundary has to be an Integer value.');
		        }
		      }
		      else {
		        $scope.error('View Range (Hz) lower boundary has to be an Integer value.');
		      }
		    }
		    else {
		        $scope.error('Dynamic Range has to be an Integer value.');
		    }
		};

		/**
		 *
		 */
		$scope.error = function (errorMsg) {
			dialogService.close();
			dialogService.open('views/error.html', 'ModalCtrl', 'Sorry: ' + errorMsg);
		};

		/**
		 *
		 */
		$scope.cancel = function () {
			dialogService.close();
		};
	});