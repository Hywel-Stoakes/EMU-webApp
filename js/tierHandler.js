EmuLabeller.tierHandler = {
	init: function(params) {
		this.internalCanvasWidth = params.internalCanvasWidth;
		this.internalCanvasHeightSmall = params.internalCanvasHeightSmall;
		this.internalCanvasHeightBig = params.internalCanvasHeightBig;
		this.tierInfos = params.tierInfos;
		this.iconImageSize = 12;
		this.isSelected = false;
		this.isEditing = false;
		this.lastSample = 0;
		this.myHistoryCounter = 0;
		this.myHistory = new Object();
		this.editAreaTextfieldName = "editArea";
		this.tierCssName = "tierSettings";
		this.historyEndError = "Cannot go back, no more history saved.... =(";
		this.commonError = "Error: It is not allowed to insert a segment here!";
		this.pointExistsError = "Error: This point already exists !";
		this.noTierError = "Error: No Tier chosen !";
		this.pointSegmentError = "Error: Points may not be inserted on a Segment Tier!";
		this.params = params;

	},

	history: function() {
		this.myHistory[this.myHistoryCounter] = jQuery.extend(true, {}, this.tierInfos);
		++this.myHistoryCounter;
	},

	goBackHistory: function() {
		if ((this.myHistoryCounter - 1) > 0) {
			delete this.tierInfos;
			this.tierInfos = jQuery.extend(true, {}, this.myHistory[this.myHistoryCounter - 2]);
			--this.myHistoryCounter;
			this.rebuildTiers();
			emulabeller.drawBuffer();
		} else alert(this.historyEndError);
	},

	addTier: function(addPointTier) {
		var my = this;
		var tName = "Tier" + (this.getLength() + 1);

		if (!addPointTier) {
			var newTier = {
				TierName: tName,
				type: "seg",
				events: []
			};
			newTier.events.push({
				label: "",
				startSample: 1,
				sampleDur: emulabeller.backend.currentBuffer.length - 1
			});
		} else {
			var newTier = {
				TierName: tName,
				type: "point",
				events: []
			};
		}

		this.addTiertoHtml(tName, this.tierCssName, "#" + this.params.cans.id);
		this.tierInfos.tiers[tName] = newTier;

		// save history state
		this.history();

		emulabeller.drawer.updateSingleTier(this.tierInfos.tiers[tName]);

	},

	addLoadedTiers: function(loadedTiers) {
		var my = this;
		$.each(loadedTiers.tiers, function() {
			my.addTiertoHtml(this.TierName, my.tierCssName, "#" + my.params.cans.id);
			my.tierInfos.tiers[this.TierName] = this;
		});
		// save history state
		this.history();
	},

	getLength: function() {
		var r = 0;
		var t = this.tierInfos.tiers;
		for (var k in t) r++;
		return r;
	},

	getCanvas: function(name) {
		return $("#" + name)[0];
	},

	getCanvasContext: function(name) {
		return this.getCanvas(name).getContext('2d');
	},

	/**
	 * append a tier
	 *
	 * @param myName is used ad id of canvas
	 * @param myCssClass is used to spec. css class
	 * @param myAppendTo
	 */
	addTiertoHtml: function(myName, myCssClass, myAppendTo) {

		var buttons = "<div class='tierButtons'><a href='#' id='" + myName + "_del' class='deleteButton'><img/></a><a href='#' id='" + myName + "_res' class='resizeButton'><img/></a><a href='#' id='" + myName + "_save' class='saveSingleTierBtn'><img/></a></div>";
		var myCan = $('<canvas>').attr({
			id: myName,
			width: this.internalCanvasWidth,
			height: this.internalCanvasHeightSmall
		}).addClass(myCssClass).add(buttons);

		$('<div class="hull' + myName + '" style="position:relative;">').attr({
			id: "hull" + myName
		}).html(myCan).appendTo(myAppendTo);

		$("#" + myName).bind("click", function(event) {
			emulabeller.tierHandler.handleTierClick(emulabeller.getX(event.originalEvent), emulabeller.getY(event.originalEvent), emulabeller.tierHandler.getTier(emulabeller.getTierName(event.originalEvent)));
		});

		$("#" + myName + "_del").bind("click", function(event) {
			var n = $(this).parent().prev().get(0).id;
			if (confirm("Do you really wish to delete Tier: '" + n + "' ?"))
				emulabeller.tierHandler.removeTier(n);
		});
		$("#" + myName + "_res").bind("click", function(event) {
			var n = $(this).parent().prev().get(0).id;
			emulabeller.tierHandler.resizeTier(n);
		});
		$("#" + myName + "_save").bind("click", function(event) {
			// alert("saving single tiers to ESPS file fomrat not implemented yet! Suggested name will be: " + emulabeller.curLoadedBaseName + "." + myName);
			emulabeller.iohandler.labFileHandler.toESPS(emulabeller.tierHandler.getTier(myName));
			window.location.href = "#savingname_dial";
		});

		$("#" + myName).bind("dblclick", function(event) {
		    console.log(emulabeller.getX(event.originalEvent));
			emulabeller.tierHandler.handleTierDoubleClick(emulabeller.getX(event.originalEvent));
		});
		$("#" + myName).bind("contextmenu", function(event) {
			emulabeller.tierHandler.handleTierClickMulti(emulabeller.getX(event.originalEvent), emulabeller.getY(event.originalEvent), emulabeller.tierHandler.getTier(this.id));
		});
		$("#" + myName).bind("mousemove", function(event) {
			curSample = emulabeller.viewPort.getCurrentSample(emulabeller.getX(event.originalEvent));
			if (emulabeller.tierHandler.isSelected && event.shiftKey) {
				emulabeller.internalMode = emulabeller.EDITMODE.LABEL_RESIZE;
				emulabeller.tierHandler.removeLabelDoubleClick();
				emulabeller.tierHandler.moveBoundary(curSample, emulabeller.getTierName(event.originalEvent));
				emulabeller.drawer.uiDrawUpdate();
			} else if (emulabeller.tierHandler.isSelected && event.altKey) {
				emulabeller.internalMode = emulabeller.EDITMODE.LABEL_MOVE;
				emulabeller.tierHandler.removeLabelDoubleClick();
				var border = emulabeller.tierHandler.moveSegment(curSample, emulabeller.getTierName(event.originalEvent));
				emulabeller.drawer.uiDrawUpdate();
			} else {
				emulabeller.tierHandler.trackMouseInTiers(event, emulabeller.getX(event.originalEvent), emulabeller.getY(event.originalEvent), emulabeller.getTierName(event.originalEvent));
			}
			emulabeller.tierHandler.lastSample = curSample;
		});
		$("#" + myName).bind("mouseout", function(event) {
			emulabeller.tierHandler.isSelected = false;
			emulabeller.viewPort.curMouseMoveTierName = "";
			emulabeller.viewPort.curMouseMoveSegmentName = "";
			emulabeller.viewPort.curMouseMoveSegmentStart = "";
			emulabeller.viewPort.curMouseMoveSegmentDuration = "";
			emulabeller.drawer.updateSingleTier(emulabeller.tierHandler.getTier(emulabeller.getTierName(event.originalEvent)));
		});
		$("#" + myName).bind("mouseup", function(event) {
			//myMouseUp(e);
		});
		$("#" + myName).bind("mousedown", function(event) {
			//myMouseDown(e);
		});
		$("#" + myName).bind("mouseout", function(event) {
			// maybe set flag to not drag over boundaries here...
			// console.log("leaving tier canvas", event);

		});


	},

	/**
	 * function called on mouse move in tiers
	 *
	 * @param event
	 * @param percX
	 * @param percY
	 * @param tierName
	 */
	trackMouseInTiers: function(event, percX, percY, tierName) {
		if (emulabeller.internalMode == emulabeller.EDITMODE.STANDARD) {
			var curTierDetails = this.getTier(tierName);
			var curSample = emulabeller.viewPort.sS + (emulabeller.viewPort.eS - emulabeller.viewPort.sS) * percX;
			var event = this.findAndMarkNearestSegmentBoundry(curTierDetails, curSample);
			if (null != event) {
				emulabeller.viewPort.curMouseMoveTierName = curTierDetails.TierName;
				emulabeller.viewPort.curMouseMoveSegmentName = emulabeller.viewPort.getId(curTierDetails, event.label, event.startSample);
				emulabeller.viewPort.curMouseMoveSegmentStart = event.startSample;
				emulabeller.viewPort.curMouseMoveSegmentDuration = event.sampleDur;
				emulabeller.tierHandler.isSelected = true;
			}
			$("*").css("cursor", "auto");
			emulabeller.drawer.updateSingleTier(curTierDetails, percX, percY);
		}
	},

	findAndMarkNearestSegmentBoundry: function(t, curSample) {
		var closestStartSample = null;
		var closestStartEvt = null;
		var e = t.events;
		for (var k in e) {
			if (closestStartSample === null || Math.abs(e[k].startSample - curSample) < Math.abs(closestStartSample - curSample)) {
				closestStartSample = e[k].startSample;
				closestStartEvt = e[k];
			}
		}
		return closestStartEvt;
	},

	rebuildTiers: function() {
		for (t in this.tierInfos.tiers) {
			this.removeTierHtml(this.tierInfos.tiers[t].TierName);
			if (null == document.getElementById(this.tierInfos.tiers[t].TierName)) {
				this.addTiertoHtml(this.tierInfos.tiers[t].TierName, this.tierCssName, "#" + this.params.cans.id);
			}
		}
	},

	removeTierHtml: function(tierName) {
		$("#" + tierName).remove();
		$("#" + tierName + "_del").remove();
		$("#" + tierName + "_res").remove();
	},


	removeTier: function(tierName) {
		this.removeTierHtml(tierName);
		delete this.tierInfos.tiers[tierName];
		// save history state
		this.history();
	},

	removeSegment: function(t, labelName, labelStart) {
		var id = emulabeller.viewPort.getId(t, labelName, labelStart);
		var halfSize = this.tierInfos.tiers[t.TierName].events[id].sampleDur / 2;
		delete this.tierInfos.tiers[t.TierName].events[id];

		if (null == this.tierInfos.tiers[t.TierName].events[id - 1]) {
			this.tierInfos.tiers[t.TierName].events[id + 1].sampleDur += 2 * halfSize;
			this.tierInfos.tiers[t.TierName].events[id + 1].startSample -= 2 * halfSize;
		} else if (null == this.tierInfos.tiers[t.TierName].events[id + 1]) {
			this.tierInfos.tiers[t.TierName].events[id - 1].sampleDur += 2 * halfSize;
		} else {
			this.tierInfos.tiers[t.TierName].events[id - 1].sampleDur += halfSize;
			this.tierInfos.tiers[t.TierName].events[id + 1].sampleDur += halfSize;
			this.tierInfos.tiers[t.TierName].events[id + 1].startSample -= halfSize;
		}
		t.events.sort(function(a, b) {
			return parseFloat(a.startSample) - parseFloat(b.startSample);
		});

	},

	removeBorder: function(t, labelName, labelStart) {
		if (null != this.tierInfos.tiers[t.TierName].events[labelName - 1]) {
			this.tierInfos.tiers[t.TierName].events[labelName - 1].sampleDur += this.tierInfos.tiers[t.TierName].events[labelName].sampleDur;
			this.tierInfos.tiers[t.TierName].events[labelName - 1].label += this.tierInfos.tiers[t.TierName].events[labelName].label;
			delete this.tierInfos.tiers[t.TierName].events[labelName];
		}
	},


	removePoint: function(t, labelName, labelStart) {
		for (s in this.tierInfos.tiers[t.TierName].events) {
			if (this.tierInfos.tiers[t.TierName].events[s].label == labelName &&
				this.tierInfos.tiers[t.TierName].events[s].startSample == labelStart) {
				console.log(this.tierInfos.tiers[t.TierName].events[s]);
				delete this.tierInfos.tiers[t.TierName].events[s];
			}
		}
	},

	deleteSelected: function() {
		var my = this;
		var t = this.getSelectedTier();
		var selected = emulabeller.viewPort.getAllSelected(t);
		var warn = "Really delete ";
		for (s in selected) warn += selected[s].label + ", ";
		if (confirm(warn.substring(0, warn.length - 2))) {
			for (s in selected) {
				if (t.type == "seg")
					this.removeSegment(t, selected[s].label, selected[s].startSample)
				if (t.type == "point")
					this.removePoint(t, selected[s].label, selected[s].startSample)
			}
			t.events.sort(function(a, b) {
				return parseFloat(a.startSample) - parseFloat(b.startSample);
			});
			this.history();
			emulabeller.drawBuffer();
		}
	},


	deleteBorder: function() {
		var my = this;
		if (emulabeller.viewPort.curMouseMoveTierName != "") {
			var t = this.getTier(emulabeller.viewPort.curMouseMoveTierName);
			if (confirm("Wollen Sie die Grenze bei '" + this.tierInfos.tiers[t.TierName].events[emulabeller.viewPort.curMouseMoveSegmentName].label + "' wirklich loeschen?")) {
				this.removeBorder(t, emulabeller.viewPort.curMouseMoveSegmentName)
				t.events.sort(function(a, b) {
					return parseFloat(a.startSample) - parseFloat(b.startSample);
				});
				this.history();
				emulabeller.drawBuffer();
			}
		} else alert("Error: Please select a boundary first!");
	},

	resizeTier: function(tierName) {
		var s = this.internalCanvasHeightBig - 1;
		if ($("#" + tierName).height() >= s)
			$("#" + tierName).height(this.internalCanvasHeightBig / 2.9);
		else
			$("#" + tierName).height(this.internalCanvasHeightBig);
	},

	handleTierClick: function(percX, percY, tierDetails) {
		// console.log(tierDetails.type)
		//deselect everything
		emulabeller.viewPort.resetSelection(tierDetails.events.length);
		emulabeller.viewPort.setSelectTier(tierDetails.TierName);
		this.removeLabelDoubleClick();
		var canvas = emulabeller.tierHandler.getCanvas(tierDetails.TierName);
		var cc = emulabeller.tierHandler.getCanvasContext(tierDetails.TierName);

		if (tierDetails.type == "seg") {
			var nearest = this.nextEvent(tierDetails, emulabeller.viewPort.getCurrentSample(percX));
			if (null != nearest) {

				emulabeller.viewPort.curMouseMoveTierName = nearest.label;
				emulabeller.viewPort.curMouseMoveTierType = tierDetails.type;
				emulabeller.viewPort.curMouseMoveSegmentName = emulabeller.viewPort.getId(tierDetails, nearest.label, nearest.startSample);
				emulabeller.viewPort.curMouseMoveSegmentStart = nearest.startSample;
				emulabeller.viewPort.curMouseMoveSegmentDuration = nearest.sampleDur;
				emulabeller.viewPort.setSelectSegment(tierDetails, nearest, true, canvas.width);
			}
		}

		if (tierDetails.type == "point") {
			var nearest = this.nearestEvent(tierDetails, emulabeller.viewPort.getCurrentSample(percX));
			if (null != nearest) {
				emulabeller.viewPort.curMouseMoveTierName = nearest.label;
				emulabeller.viewPort.curMouseMoveTierType = tierDetails.type;
				emulabeller.viewPort.curMouseMoveSegmentName = emulabeller.viewPort.getId(tierDetails, nearest.label, nearest.startSample);
				emulabeller.viewPort.curMouseMoveSegmentStart = nearest.startSample;
				emulabeller.viewPort.curMouseMoveSegmentDuration = nearest.sampleDur;
				emulabeller.viewPort.setSelectPoint(tierDetails, nearest, true, canvas.width);
			}
		}

		emulabeller.drawBuffer();
	},


	handleTierClickMulti: function(percX, percY, tierDetails) {

		//deselect everything
		if (emulabeller.viewPort.getSelectTier() != tierDetails.TierName) {
			emulabeller.viewPort.setSelectTier(tierDetails.TierName);
			emulabeller.viewPort.resetSelection(tierDetails.events.length);
		}
		this.removeLabelDoubleClick();
		var canvas = emulabeller.tierHandler.getCanvas(tierDetails.TierName);
		var cc = emulabeller.tierHandler.getCanvasContext(tierDetails.TierName);

		if (tierDetails.type == "seg") {
			var nearest = this.nearestSegment(tierDetails, emulabeller.viewPort.getCurrentSample(percX));
			if (null != nearest) {
				emulabeller.viewPort.curMouseMoveTierName = event.label;
				emulabeller.viewPort.curMouseMoveSegmentName = emulabeller.viewPort.getId(tierDetails, event.label, event.startSample);
				emulabeller.viewPort.MouseSegmentName = emulabeller.viewPort.getId(tierDetails, event.label, event.startSample);
				emulabeller.viewPort.curMouseMoveSegmentStart = event.startSample;
				emulabeller.viewPort.curMouseMoveSegmentDuration = event.sampleDur;
				if (emulabeller.viewPort.setSelectMultiSegment(tierDetails, nearest, true, canvas.width) == false) {
					this.handleTierClick(percX, percY, tierDetails);
				}
			}
		}
		emulabeller.drawBuffer();
	},


	handleTierDoubleClick: function(percX) {
		var my = this;
		tierDetails = this.getSelectedTier();
		emulabeller.viewPort.setSelectTier(tierDetails.TierName);
		emulabeller.viewPort.resetSelection(tierDetails.events.length);
		var canvas = emulabeller.tierHandler.getCanvas(tierDetails.TierName);
		var cc = emulabeller.tierHandler.getCanvasContext(tierDetails.TierName);
		var edit = $('#' + this.editAreaTextfieldName);
		if (edit.length === 0) {
		    emulabeller.tierHandler.isEditing = true;
			if (tierDetails.type == "seg") {
				if (percX)
					var nearest = this.nearestSegment(tierDetails, emulabeller.viewPort.getCurrentSample(percX));
				if (null != nearest) {
					emulabeller.viewPort.setSelectSegment(tierDetails, nearest, true, canvas.width);
					var posS = emulabeller.viewPort.getPos(canvas.clientWidth, emulabeller.viewPort.selectS);
					var posE = emulabeller.viewPort.getPos(canvas.clientWidth, emulabeller.viewPort.selectE);
					this.createEditArea(tierDetails.TierName, posS, 0, posE - posS - 5, canvas.height / 2 - 5, nearest.label, canvas, true);
				}

			} else if (tierDetails.type == "point") {
				var nearest = this.nearestEvent(tierDetails, emulabeller.viewPort.getCurrentSample(percX));
				emulabeller.viewPort.setSelectSegment(tierDetails, nearest, true, canvas.width);
				emulabeller.viewPort.select(nearest.startSample, nearest.startSample);
				var posS = emulabeller.viewPort.getPos(canvas.clientWidth, emulabeller.viewPort.selectS);
				var editWidth = 45;
				this.createEditArea(tierDetails.TierName, posS - ((editWidth - 5) / 2), canvas.height / 8, editWidth - 5, canvas.height / 4 - 5, nearest.label, canvas, true);
			}
		} else {
			my.removeLabelDoubleClick();
		}
		emulabeller.drawBuffer();
	},

	nearestSegment: function(t, curSample) {
		var e = t.events;
		var r = null;
		for (var k in e) {
			if (curSample >= e[k].startSample && curSample <= (e[k].startSample + e[k].sampleDur)) {
				r = e[k];
			}
		}
		return r;
	},

	tierExists: function(name) {
		var t = this.tierInfos.tiers;
		for (var k in t) {
			if (t[k].TierName == name) return true;
		}
		return false;
	},


	nearestEvent: function(t, curSample) {
		var e = t.events;
		var r = null;
		var temp = emulabeller.viewPort.eS;
		for (var k in e) {
			var diff = Math.abs(curSample - e[k].startSample);
			if (diff < temp) {
				temp = diff;
				r = e[k];
			}
		}
		return r;
	},

	nextEvent: function(t, curSample) {
		var e = t.events;
		var r = null;
		var temp = 0;
		for (var k in e) {
			var diff = curSample - e[k].startSample;
			if (diff >= temp && diff >= 0 && diff <= e[k].sampleDur) {
				temp = diff;
				r = e[k];
			}
		}
		return r;
	},


	getSelectedTier: function() {
		return this.tierInfos.tiers[emulabeller.viewPort.getSelectTier()];
	},

	getSelectedTierType: function() {
		if (null == this.tierInfos.tiers[emulabeller.viewPort.getSelectTier()]) return false;
		return this.tierInfos.tiers[emulabeller.viewPort.getSelectTier()].type;
	},

	getTiers: function() {
		return this.tierInfos.tiers;
	},

	getTier: function(t) {
		return this.tierInfos.tiers[t];
	},


	createEditArea: function(myName, x, y, width, height, label, c, saveTier) {
		var my = this;
		var textAreaX = Math.round(x) + c.offsetLeft + 2;
		var textAreaY = c.offsetTop + 2 + y;
		var textAreaWidth = width;
		var textAreaHeight = height;
		var content = $("<textarea>").attr({
			id: "editing"
		}).css({
			"top": textAreaY + "px",
			"left": textAreaX + "px",
			"width": textAreaWidth + "px",
			"height": textAreaHeight + "px"
		}).addClass(this.editAreaTextfieldName).text(label);

		$("#hull" + myName).prepend(content);

		this.createSelection(document.getElementById("editing"), 0, label.length); // select textarea text     
		emulabeller.internalMode = emulabeller.EDITMODE.LABEL_RENAME;		
	},


	createSelection: function(field, start, end) {
		if (field.createTextRange) {
			var selRange = field.createTextRange();
			selRange.collapse(true);
			selRange.moveStart('character', start);
			selRange.moveEnd('character', end);
			selRange.select();
		} else if (field.setSelectionRange) {
			field.setSelectionRange(start, end);
		} else if (field.selectionStart) {
			field.selectionStart = start;
			field.selectionEnd = end;
		}
		field.focus();
	},

	saveLabelName: function(a) {
		var tierDetails = this.getSelectedTier();
		var content = $("#editing").val();
		tierDetails.events[emulabeller.viewPort.getSelectName()].label = content.replace(/[\n\r]/g, ''); // remove new line from content with regex
		emulabeller.drawer.updateSingleTier(tierDetails);

		// save history state
		this.history();

	},

	saveTierName: function(a) {
		var my = this;
		var tierDetails = this.getSelectedTier();
		var old_key = tierDetails.TierName;
		var new_key = $("#editing").val().replace(/[\n\r]/g, '');

		if (!this.tierExists(new_key)) {
			var backup = jQuery.extend(true, {}, tierDetails);
			delete this.tierInfos.tiers[old_key];
			$("#" + old_key).attr("id", new_key);
			my.tierInfos.tiers[new_key] = backup;
			my.tierInfos.tiers[new_key].TierName = new_key;
			emulabeller.drawBuffer();
			// save history state
			this.history();
		} else {
			alert("Error : A tier with this name ('" + new_key + "') already exists!");
		}

	},

	renameTier: function() { //maybe rename to removeLabelBox or something
		var my = this;
		var tierDetails = this.getSelectedTier();
		if (null != tierDetails) {
			var canvas = emulabeller.tierHandler.getCanvas(tierDetails.TierName);
			var posS = emulabeller.viewPort.getPos(canvas.clientWidth, 0);
			this.createEditArea(tierDetails.TierName, 0, posS, canvas.clientWidth - 5, canvas.height / 2 - 5, tierDetails.TierName, canvas, false);
		} else {
			alert("Please mark a tier first...");
		}

	},

	addBorder: function(t, ev, border) {
		var my = this;
		var splitleft = (border - ev.startSample);
		var splitright = (ev.sampleDur - splitleft);
		ev.sampleDur = splitleft - 1;
		t.events.push({
			"label": "newSegment",
			"startSample": Math.round(border),
			"sampleDur": Math.round(splitright)
		});
		t.events.sort(function(a, b) {
			return parseFloat(a.startSample) - parseFloat(b.startSample);
		});
		// save history state
		this.history();
	},

	addSegment: function(t, ev, start, end) {
		var my = this;
		var splitleft = (start - ev.startSample);
		var splitright = (ev.sampleDur - splitleft);
		var splitsecond = (end - start);
		ev.sampleDur = splitleft - 1;
		t.events.push({
			"label": "",
			"startSample": start,
			"sampleDur": splitsecond - 1
		});
		t.events.push({
			"label": "",
			"startSample": end,
			"sampleDur": splitright - splitsecond
		});
		t.events.sort(function(a, b) {
			return parseFloat(a.startSample) - parseFloat(b.startSample);
		});
		// save history state
		this.history();
	},

	addSegmentAtSelection: function() {
		var sT = this.getSelectedTier();
		if (null != sT) {
			if (sT.type == "seg") {
				var thisSegment = this.nextEvent(sT, emulabeller.viewPort.selectS);
				var otherSegment = this.nextEvent(sT, emulabeller.viewPort.selectE);
				if (thisSegment == otherSegment) {
					if (emulabeller.viewPort.selectS == emulabeller.viewPort.selectE) {
						if (null != thisSegment)
							this.addBorder(sT, thisSegment, emulabeller.viewPort.selectS);
						else
							alert(this.commonError);
					} else {
						this.addSegment(sT, thisSegment, emulabeller.viewPort.selectS, emulabeller.viewPort.selectE);
					}
				} else {
					var percx = emulabeller.viewPort.getCurrentPercent(emulabeller.viewPort.selectS);
					this.handleTierDoubleClick(percx); 
				}
			} else if (sT.type = "point") {
				if (emulabeller.viewPort.selectS == emulabeller.viewPort.selectE) {
					var thisPoint = this.nearestEvent(sT, emulabeller.viewPort.selectS);
					if (thisPoint == null || thisPoint.startSample != emulabeller.viewPort.selectS) {
						sT.events.push({
							"label": "newPoint",
							"startSample": emulabeller.viewPort.selectS,
							"sampleDur": 0
						});
						sT.events.sort(function(a, b) {
							return parseFloat(a.startSample) - parseFloat(b.startSample);
						});
					} else {
						alert(this.pointExistsError);
					}
				} else {
					alert(this.pointSegmentError);
				}
			}
			emulabeller.drawBuffer();
		} else {
			alert(this.noTierError);
		}

	},

	removeLabelDoubleClick: function() {
		var my = this;
		$('.' + this.editAreaTextfieldName).remove();
		emulabeller.tierHandler.isEditing = false;
	},

	moveBoundary: function(newTime, myName) {
		newTime = Math.round(newTime);
		if (null != this.tierInfos.tiers[myName]) {
			var left = this.tierInfos.tiers[myName].events[emulabeller.viewPort.curMouseMoveSegmentName - 1];
			var me = this.tierInfos.tiers[myName].events[emulabeller.viewPort.curMouseMoveSegmentName];
			var right = this.tierInfos.tiers[myName].events[emulabeller.viewPort.curMouseMoveSegmentName + 1];


			if (this.tierInfos.tiers[myName].type == "seg") {
				var old = me.startSample;

				// moving at the center
				if (null != left && null != right) {
					if (newTime > left.startSample && newTime < right.startSample) {
						me.startSample = newTime;
						me.sampleDur -= (newTime - old);
						left.sampleDur += (newTime - old);
					}
				}
				// moving the last element
				else if (null != left) {
					if (newTime > left.startSample && newTime < (emulabeller.viewPort.eS - 20)) {
						left.sampleDur += (newTime - old);
						me.startSample = newTime;
						me.sampleDur -= (newTime - old);
					}

				}
				// moving the fist element
				else if (null != right) {
					if (newTime > (emulabeller.viewPort.sS + 20) && newTime < right.startSample) {
						me.startSample = newTime;
						me.sampleDur -= (newTime - old);
					}
				}
			} else {
				oldTime = me.startSample;
				if (null != left && null != right) {
					if (newTime > left.startSample && newTime < right.startSample) {
						me.startSample = newTime;
					}
				}
				// moving the last element
				else if (null != left) {
					if (newTime > left.startSample && newTime < (emulabeller.viewPort.eS - 20)) {
						left.sampleDur += (newTime - old);
						me.startSample = newTime;
						me.sampleDur -= (newTime - old);
					}
				}
				// moving the fist element
				else if (null != right) {
					if (newTime > (emulabeller.viewPort.sS + 20) && newTime < right.startSample) {
						me.startSample = newTime;
						me.sampleDur -= (newTime - old);
					}
				}
			}
			emulabeller.viewPort.selectMove(this.tierInfos.tiers[myName], me);
			emulabeller.viewPort.select(me.startSample, me.startSample);
		}
	},


	moveSegment: function(newTime, myName) {
		changeTime = Math.round(newTime - this.lastSample);
		var t = this.tierInfos.tiers[myName];
		var doMove = false;
		var first = true;
		var last = 0;
		var f = 0;
		var l = emulabeller.viewPort.countSelected();
		if (null != t) {
			var selected = emulabeller.viewPort.getAllSelected(t);
			for (var i = 0; i < selected.length; i++) {
				if (null != selected[i]) {
					if (first) {
						if ((t.events[i].startSample + changeTime > t.events[i - 1].startSample) &&
							(t.events[i + l - 1].startSample + t.events[i + l - 1].sampleDur + changeTime < t.events[i + l + 1].startSample - 1)) {
							doMove = true;
							t.events[i - 1].sampleDur += changeTime;
						}
						first = false;
					}
					last = i + 1;
					//t.events[i - 1].sampleDur += changeTime;
					t.events[i].startSample += changeTime;

				}
			}
			if (doMove) {
				t.events[last].startSample += changeTime;
				t.events[last].sampleDur -= changeTime;
				//emulabeller.viewPort.select(t.events[f].startSample, t.events[last].startSample - 1);
			}
		}
	},

	/**
	 * returns either the tier details of the tier above
	 * tName or below tName
	 *
	 * @param tName name of tier to look above or below
	 * @param getAbove boolian  if true it gets the tier above
	 * if false the tier below
	 */
	getNeighboringTier: function(tName, getAbove) {
		var hullID;
		if (getAbove) {
			hullID = $("#hull" + tName).prev().attr('id');
			console.log(hullID);
			if (!hullID) {
				alert("no tier above the selected boundary!");
			}
		} else {
			hullID = $("#hull" + tName).next().attr('id');
			if (!hullID) {
				alert("no tier below the selected boundary!");
			}
		}
		var neighID = hullID.replace(/hull/g, '');
		return (this.getTier(neighID));

	},

	/**
	 * finds the closest boundary to the currently
	 * selected boundary in the tier above it
	 * and snaps it to that sample position
	 *
	 * @param toTop boolian if set to true will snap to top
	 * otherwise to bottom
	 */
	snapSelectedBoundaryToNearestTopOrBottom: function(toTop) {
		if (emulabeller.internalMode == emulabeller.EDITMODE.STANDARD) {
			var neighTier = this.getNeighboringTier(emulabeller.viewPort.curMouseMoveTierName, toTop);

			var closestSeg = this.nearestEvent(neighTier, emulabeller.viewPort.curMouseMoveSegmentStart);

			// console.log("############")
			// console.log(emulabeller.viewPort.curMouseMoveSegmentStart);
			// console.log(neighTier);
			// console.log(closestSeg);
			if (closestSeg) {
				// console.log(closestSeg);
				this.moveBoundary(closestSeg.startSample, emulabeller.viewPort.curMouseMoveTierName);
			} else {
				alert("closest segment is null?!?!?!?");
			}
		}
		emulabeller.drawBuffer();
		// save history state
		this.history();
	},

	/**
	 * finds nearest zero crossing to selected boundary
	 * and move that segment to that position
	 */
	snapToNearestZeroCrossing: function() {
		var chan = emulabeller.backend.currentBuffer.getChannelData(0);

		var leftWinData = chan.subarray(0, emulabeller.viewPort.curMouseMoveSegmentStart + 1);
		var rightWinData = chan.subarray(emulabeller.viewPort.curMouseMoveSegmentStart, emulabeller.backend.currentBuffer.length);
		//look right
		var rightXoffset = 0;
		for (var i = 0; i < rightWinData.length; i++) {
			if (rightWinData[i] < 0 && rightWinData[i + 1] > 0 ||
				rightWinData[i] > 0 && rightWinData[i + 1] < 0) {
				rightXoffset = i;
				break;
			}
		}
		// look left
		var leftXoffset = 0;
		for (var i = leftWinData.length; i > 0; i--) {
			if (leftWinData[i] < 0 && leftWinData[i - 1] > 0 ||
				leftWinData[i] > 0 && leftWinData[i - 1] < 0) {
				leftXoffset = emulabeller.viewPort.curMouseMoveSegmentStart - i;
				break;
			}
		}
		// see which is closer then move there
		if (rightXoffset < leftXoffset) {
			this.moveBoundary(emulabeller.viewPort.curMouseMoveSegmentStart + rightXoffset + 1, emulabeller.viewPort.curMouseMoveTierName);
		} else {
			this.moveBoundary(emulabeller.viewPort.curMouseMoveSegmentStart - leftXoffset, emulabeller.viewPort.curMouseMoveTierName);
		}
		emulabeller.drawBuffer();
		// save history state
		this.history();
	},
	/**
	 * moves selection to next event if
	 * there is one to move to
	 */
	selectNextEvent: function() {
		var sT = this.getSelectedTier();
		var nextEvent = this.nextEvent(sT, emulabeller.viewPort.selectE + 1); // plus 1 to be in next segment
		if (nextEvent !== null) {
			emulabeller.viewPort.resetSelection(100); // SIC why 100??? why hardcode? why does fucntion need nr?
			emulabeller.viewPort.setSelectSegment(sT, nextEvent, true, this.getCanvas(sT.TierName));
			emulabeller.viewPort.select(nextEvent.startSample, nextEvent.startSample + nextEvent.sampleDur + 1);
			emulabeller.drawBuffer();
		}
	}

};