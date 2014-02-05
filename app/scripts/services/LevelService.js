'use strict';

angular.module('emulvcApp')
	.service('Levelservice', function Levelservice($rootScope) {
		// shared service object
		var sServObj = {};

		sServObj.data = {};

		sServObj.getData = function () {
			return sServObj.data;
		};

		sServObj.setData = function (data) {
			angular.copy(data, sServObj.data);
		};

		/**
		 * gets the current (mousemove) Level Name
		 */
		sServObj.getcurMouseLevelDetails = function (levelName) {
			var curLevel = null;
			sServObj.data.levels.forEach(function (t) {
				if (t.LevelName === levelName) {
					curLevel = t;
				}
			});
			return curLevel;

		};

		/**
		 * get's level details by passing in level Name
		 */
		sServObj.getLevelDetails = function (levelName) {
			var curLevel = null;
			var y = null;
			sServObj.data.levels.forEach(function (t, x) {
				if (t.LevelName === levelName) {
					curLevel = t;
					y = x;
				}
			});
			return {
				level: curLevel,
				id: y
			};
		};

		/**
		 * get's element details by passing in levelName and elemtentid
		 */
		sServObj.getElementDetails = function (levelName, elementid) {
			var details = null;
			sServObj.data.levels.forEach(function (t) {
				if (t.LevelName === levelName) {
					t.elements.forEach(function (element, y) {
						if (y == elementid) {
							details = element;
						}
					});
				}
			});
			return details;
		};



		sServObj.getEvent = function (pcm, level, nearest, maximum) {
			var evtr = null;
			if (level.type === "seg") {
				angular.forEach(level.elements, function (evt, id) {
					if (nearest) {
						if (pcm >= evt.sampleStart && pcm <= (evt.sampleStart + evt.sampleDur)) {
							if (pcm - evt.sampleStart >= evt.sampleDur / 2) {
								evtr = level.elements[id + 1];
							} else {
								evtr = level.elements[id];
							}
						}
					} else {
						if (pcm >= evt.sampleStart && pcm <= (evt.sampleStart + evt.sampleDur)) {
							evtr = level.elements[id];
						}
					}
				});
			} else {
				var spaceLower = 0;
				var spaceHigher = 0;
				angular.forEach(level.elements, function (evt, key) {
					if (key < level.elements.length - 1) {
						spaceHigher = evt.sampleStart + (level.elements[key + 1].sampleStart - level.elements[key].sampleStart) / 2;
					} else {
						spaceHigher = maximum;
					}
					if (key > 0) {
						spaceLower = evt.sampleStart - (level.elements[key].sampleStart - level.elements[key - 1].sampleStart) / 2;
					}
					if (pcm <= spaceHigher && pcm >= spaceLower) {
						evtr = evt;
					}
				});
			}
			return evtr;
		};


		sServObj.getEventId = function (pcm, level, nearest, maximum) {
			var id = 0;
			var ret = 0;
			if (level.type === "seg") {
				angular.forEach(level.elements, function (evt, id) {
					if (nearest) {
						if (pcm >= evt.sampleStart && pcm <= (evt.sampleStart + evt.sampleDur)) {
							if (pcm - evt.sampleStart >= evt.sampleDur / 2) {
								ret = id + 1;
							} else {
								ret = id;
							}
						}
					} else {
						if (pcm >= evt.sampleStart && pcm <= (evt.sampleStart + evt.sampleDur)) {
							ret = id;
						}
					}
				});
			} else {
				var spaceLower = 0;
				var spaceHigher = 0;
				angular.forEach(level.elements, function (evt, key) {
					if (key < level.elements.length - 1) {
						spaceHigher = evt.sampleStart + (level.elements[key + 1].sampleStart - level.elements[key].sampleStart) / 2;
					} else {
						spaceHigher = maximum;
					}
					if (key > 0) {
						spaceLower = evt.sampleStart - (level.elements[key].sampleStart - level.elements[key - 1].sampleStart) / 2;
					}
					if (pcm <= spaceHigher && pcm >= spaceLower) {
						ret = id;
					}
					++id;
				});
			}
			return ret;
		};



		sServObj.deleteLevel = function (levelName) {
			var y = 0;
			var curLevel;
			angular.forEach(sServObj.data.levels, function (t, x) {
				if (t.LevelName === levelName) {
					curLevel = t;
					y = x;
					sServObj.data.levels.splice(x, 1);
				}
			});
			return {
				level: curLevel,
				id: y,
				name: levelName
			};
		};

		/**
		 * rename the label of a level by passing in level name and id
		 */
		sServObj.renameLabel = function (levelName, id, newLabelName) {
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName) {
					angular.forEach(t.elements, function (evt, i) {
						if (id == i) {
							evt.label = newLabelName;
						}
					});
				}
			});
		};

		/**
		 * rename the label of a level by passing in level name and id
		 */
		sServObj.renameLevel = function (oldname, newname) {
			angular.forEach(sServObj.data.levels, function (t, i) {
				if (t.LevelName === oldname) {
					t.LevelName = newname;
				}
			});
		};

		/**
		 * traverse through lavels an return next/prev event and id
		 */
		sServObj.tabNext = function (invers, now, tN) {
			var ret = new Object();
			angular.forEach(sServObj.data.levels, function (t) {
				var i = 0;
				if (t.LevelName === tN) {
					angular.forEach(t.elements, function (evt) {
						if (i === now) {
							ret.event = evt;
							ret.id = now;
						}
						++i;
					});
				}
			});
			return ret;
		};

		sServObj.deleteSegmentsInvers = function (segments, ids, levelName) {
			var segm, segid;
			var start = ids[0] - 1;
			var end = ids[ids.length - 1] + 1;
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName) {
					if (t.type === "seg") {
						var length = 0;
						for (var x in segments) {
							length += segments[x].sampleDur;
						}
						if (start >= 0) {
							t.elements[start].sampleDur -= length / 2;
							t.elements[start + 1].sampleDur -= length / 2;
							t.elements[start + 1].sampleStart += length / 2;
							for (var x in ids) {
								t.elements.splice(ids[x], 0, segments[x]);
							}

							segm = t.elements[start];
							segid = start;

						} else {
							segm = t.elements[0];
							segid = 0;
						}
					}
				}
			});
			return {
				segment: segm,
				id: segid
			};
		};

		sServObj.deleteSegments = function (segments, ids, levelName) {
			var segm, segid;
			var start = ids[0] - 1;
			var end = ids[ids.length - 1] + 1;
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName) {
					if (t.type === "seg") {
						var length = 0;
						for (var x in segments) {
							length += segments[x].sampleDur;
						}
						if (start >= 0) {
							t.elements[start].sampleDur += length / 2;
							t.elements[end].sampleDur += length / 2;
							t.elements[end].sampleStart -= length / 2;
							t.elements.splice(ids[0], ids.length);
							segm = t.elements[start];
							segid = start;

						} else {
							segm = t.elements[0];
							segid = 0;
						}
					}
				}
			});
			return {
				segment: segm,
				id: segid
			};
		};

		sServObj.insertSegmentInvers = function (start, end, levelName, newLabel) {
			var ret = true;
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName) {
					if (start == end) {
						var startID = -1;
						angular.forEach(t.elements, function (evt, id) {
							if (start == evt.sampleStart) {
								startID = id;
								ret = true;
							}
						});
						if (ret) {
							var diff = t.elements[startID].sampleDur;
							t.elements[startID - 1].sampleDur += diff;
							t.elements.splice(startID, 1);
						}
					} else {
						var startID = -1;
						angular.forEach(t.elements, function (evt, id) {
							if (start == evt.sampleStart) {
								startID = id;
								ret = true;
							}
						});
						if (ret) {
							var diff = t.elements[startID].sampleDur;
							var diff2 = t.elements[startID + 1].sampleDur;
							t.elements[startID - 1].sampleDur += (diff + diff2);
							t.elements.splice(startID, 2);
						}
					}
				}
			});
			return ret;
		};

		sServObj.insertSegment = function (start, end, levelName, newLabel) {
			var ret = true;
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName) {
					if (start == end) {
						var startID = -1;
						angular.forEach(t.elements, function (evt, id) {
							if (start >= evt.sampleStart && start <= (evt.sampleStart + evt.sampleDur)) {
								startID = id;
							}
							if (evt.sampleStart == start) {
								ret = false;
							}
							if (evt.sampleStart + evt.sampleDur == start) {
								ret = false;
							}
						});
						if (ret) {
							var diff = start - t.elements[startID].sampleStart;
							t.elements.splice(startID, 0, angular.copy(t.elements[startID]));
							t.elements[startID + 1].sampleStart = start;
							t.elements[startID + 1].sampleDur = t.elements[startID].sampleDur - diff;
							t.elements[startID + 1].label = newLabel;
							t.elements[startID].sampleDur = diff;
						}
					} else {
						var startID = -1;
						var endID = -1;
						angular.forEach(t.elements, function (evt, id) {
							if (start >= evt.sampleStart && start <= (evt.sampleStart + evt.sampleDur)) {
								startID = id;
							}
							if (end >= evt.sampleStart && end <= (evt.sampleStart + evt.sampleDur)) {
								endID = id;
							}
						});
						ret = (startID === endID);
						if (startID === endID) {
							var diff = start - t.elements[startID].sampleStart;
							var diff2 = end - start;
							t.elements.splice(startID, 0, angular.copy(t.elements[startID]));
							t.elements.splice(startID, 0, angular.copy(t.elements[startID]));
							t.elements[startID + 1].sampleStart = start;
							t.elements[startID + 1].sampleDur = diff2;
							t.elements[startID + 1].label = newLabel;
							t.elements[startID + 2].sampleStart = end;
							t.elements[startID + 2].sampleDur = t.elements[startID].sampleDur - diff - diff2;
							t.elements[startID + 2].label = newLabel;
							t.elements[startID].sampleDur = diff;

						}
					}
				}
			});
			return ret;
		};

		sServObj.insertPoint = function (startP, levelName, pointName) {
			var ret = false;
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName && t.type == "point") {
					var pid = 0;
					var last = 0;
					angular.forEach(t.elements, function (evt, id) {
						if (!ret) {
							if (startP > last && startP < evt.sampleStart && (Math.floor(startP) != Math.floor(evt.sampleStart))) {

								console.log(t.elements);
								console.log(id);


								t.elements.splice(id - 1, 0, angular.copy(t.elements[id - 1]));

								console.log(t.elements);

								t.elements[id].sampleStart = startP;
								t.elements[id].label = pointName;
								ret = true;
							}
							last = evt.sampleStart;
						}

					});
				}
			});
			return ret;
		};

		sServObj.insertPointInvers = function (startP, levelName, pointName) {
			var ret = false;
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName && t.type == "point") {
					var pid = 0;
					var last = 0;
					angular.forEach(t.elements, function (evt, id) {
						if (!ret) {
							if (startP == evt.sampleStart) {
								t.elements.splice(id, 1);
								ret = true;
							}
						}
					});
				}
			});
			return ret;
		};

		sServObj.deleteBoundary = function (toDelete, levelName, levelType) {
			angular.forEach(sServObj.data.levels, function (t) {
				if (t.LevelName === levelName) {
					angular.forEach(t.elements, function (evt, id) {
						if (evt.sampleStart == toDelete.sampleStart) {
							if (t.type === "point") {
								t.elements.splice(id, 1);
							} else {
								t.elements[id - 1].label += t.elements[id].label;
								t.elements[id - 1].sampleDur += t.elements[id].sampleDur;
								t.elements.splice(id, 1);
							}
						}
					});
				}
			});
		};


		sServObj.snapBoundary = function (toTop, sample, levelName, segID) {
			var neighTd;
			var thisTd;
			var neighTdIdx;
			var absMinDist = Infinity;
			var absDist;
			var minDist;
			sServObj.data.levels.forEach(function (t, tIdx) {
				if (t.LevelName === levelName) {
					thisTd = t;
					if (toTop) {
						if (tIdx >= 1) {
							neighTd = sServObj.data.levels[tIdx - 1];
						} else {
							return false;
						}
					} else {
						if (tIdx < sServObj.data.levels.length - 1) {
							neighTd = sServObj.data.levels[tIdx + 1];
						} else {
							return false;
						}
					}
					neighTd.elements.forEach(function (itm) {
						absDist = Math.abs(sample - itm.sampleStart);
						if (absDist < absMinDist) {
							absMinDist = absDist;
							minDist = itm.sampleStart - sample;
						}
					});
				}
			});


			if (minDist !== undefined) {
				this.moveBoundry(minDist, thisTd, segID);
				return minDist;
			} else {
				return false;
			}
		};

		sServObj.moveBoundry = function (changeTime, t, seg, maximum) {
			if (null !== t) { // && t.LevelName === viewState.getcurMouseLevelName()
				if (t.type === 'seg') {
					if (seg > 1 && (t.elements[seg - 1].sampleDur + changeTime) >= 1 && (t.elements[seg].sampleDur - changeTime) >= 1) {
						t.elements[seg - 1].sampleDur += changeTime;
						t.elements[seg].sampleStart += changeTime;
						t.elements[seg].sampleDur -= changeTime;
					}
				} else {
					if (seg > 0 && seg < t.elements.length - 1) {
						if (t.elements[seg].sampleStart + changeTime >= t.elements[seg - 1].sampleStart &&
							t.elements[seg].sampleStart + changeTime <= t.elements[seg + 1].sampleStart)
							t.elements[seg].sampleStart += changeTime;
					} else if (seg == 0) {
						if (t.elements[seg].sampleStart + changeTime >= 0 &&
							t.elements[seg].sampleStart + changeTime <= t.elements[seg + 1].sampleStart)
							t.elements[seg].sampleStart += changeTime;
					} else if (seg == t.elements.length - 1) {
						if (t.elements[seg].sampleStart + changeTime >= t.elements[seg - 1].sampleStart &&
							t.elements[seg].sampleStart + changeTime <= maximum)
							t.elements[seg].sampleStart += changeTime;
					}
				}
			}
		};


		sServObj.moveSegment = function (changeTime, t, selected) {
			if (null !== t) {
				if ((t.elements[selected[0] - 1].sampleDur + changeTime) >= 1 && (t.elements[selected[selected.length - 1] + 1].sampleDur - changeTime) >= 1) {
					t.elements[selected[0] - 1].sampleDur += changeTime;
					for (var i = 0; i < selected.length; i++) {
						t.elements[selected[i]].sampleStart += changeTime;
					}
					t.elements[selected[selected.length - 1] + 1].sampleStart += changeTime;
					t.elements[selected[selected.length - 1] + 1].sampleDur -= changeTime;
				}
			}
		};

		sServObj.expandSegment = function (expand, rightSide, selected, tN, changeTime) {
			var startTime = 0;
			var i;
			if (!expand) {
				changeTime = 0 - changeTime;
			}
			if (rightSide) {
				angular.forEach(sServObj.data.levels, function (t) {
					if (t.LevelName === tN) {
						if (t.elements[selected[selected.length - 1] + 1].sampleDur > (selected.length * changeTime)) {
							if (t.elements[selected[0]].sampleDur > -(selected.length * changeTime)) {
								var found = false;
								for (i = 1; i <= selected.length; i++) {
									if (t.elements[selected[i - 1]].sampleDur + changeTime <= 0) {
										found = true;
									}
								}
								if (found) {
									$rootScope.$broadcast('errorMessage', 'Expand Segements Error: Cannot Expand/Shrink. Segment would be too small');

								} else {
									for (i = 1; i <= selected.length; i++) {
										t.elements[selected[i - 1]].sampleStart += startTime;
										t.elements[selected[i - 1]].sampleDur += changeTime;
										startTime = i * changeTime;
									}
									t.elements[selected[selected.length - 1] + 1].sampleStart += startTime;
									t.elements[selected[selected.length - 1] + 1].sampleDur -= startTime;
								}
							} else {
								$rootScope.$broadcast('errorMessage', 'Expand Segements Error: No Space left to decrease');

							}
						} else {
							$rootScope.$broadcast('errorMessage', 'Expand Segements Error: No Space left to increase');
						}
					}
				});
			} else {
				angular.forEach(sServObj.data.levels, function (t) {
					if (t.LevelName === tN) {
						if (t.elements[selected[0] - 1].sampleDur > (selected.length * changeTime)) {
							if (t.elements[selected[selected.length - 1]].sampleDur > (selected.length * changeTime)) {
								var found = false;
								for (i = 1; i <= selected.length; i++) {
									if (t.elements[selected[i - 1]].sampleDur + changeTime <= 0) {
										found = true;
									}
								}
								if (found) {
									$rootScope.$broadcast('errorMessage', 'Expand Segements Error : Cannot Expand/Shrink. Segment would be too small');
								} else {
									for (i = 0; i < selected.length; i++) {
										t.elements[selected[i]].sampleStart -= (changeTime * (selected.length - i));
										t.elements[selected[i]].sampleDur += changeTime;
									}
									t.elements[selected[0] - 1].sampleDur -= changeTime * selected.length;
								}
							} else {
								$rootScope.$broadcast('errorMessage', 'Expand Segements Error : No Space left to increase');
							}
						} else {
							$rootScope.$broadcast('errorMessage', 'Expand Segements Error : No Space left to decrease');
						}
					}
				});
			}
		};



		return sServObj;

	});