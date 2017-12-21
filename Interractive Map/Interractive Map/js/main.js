// ========= APP SETTINGS ===============
var isScrollToMobileEnabled = false;  // enabling "scroll to" on link of places on mobile
var isPinchZoomEnabled = false; // enable zoom on pinch on mobile TODO : Verify if it's still in use....


// ====================== INITIALIZATION ===================================

// loading JSON datas
var isDataLoaded = false;
var _PLACES;
var request = $.getJSON("models/places.json", function (data) {
  _PLACES = data.places;
});


var svgElement = $('#svg')[0]; // SVG Element (have to be JS element)

// -------------------------------


// ========= utility function ======
// doesn't need to be in Dom Ready
function AlertMessage(txt) {
  $(".alert-area .alert-text").html(txt);
}

function DisableLoadingMask(jqObj, duration) {
  if (duration === undefined) {
	duration = 500;
  }
  jqObj.animate({opacity: 0}, duration, function () {
	jqObj.addClass("hidden");
  });
}

// =========================================================
// ================ ON DOM READY ==========================
//==========================================================
$(document).ready(function () {

// we assume the svg is part of dom loading elements... 
// $svg.on('load'....); doesn't seems to work on browsers but Chrome :(
  DisableLoadingMask($("#map_svg .loading-mask"), 500);


  // === JSON HANDLING ===

  request.done(function () {
	isDataLoaded = true;
	LoadData();
  });
  // -----------------

  // === SvgPanZoom options ===
  var svgPanZoomOptions = {
	panEnabled: true
	, controlIconsEnabled: false
	, zoomEnabled: true
	, dblClickZoomEnabled: false
	, mouseWheelZoomEnabled: true
	, preventMouseEventsDefault: true
	, zoomScaleSensitivity: 1
	, minZoom: 0.5
	, maxZoom: 5
	, fit: true
	, contain: true
	, center: true
	, refreshRate: 'auto'
  };
  // --------------


  // ==== HANDLE PINCH ZOOM (! buggy !) =========
  if (isPinchZoomEnabled) {
	var eventsHandler;
	eventsHandler = {
	  haltEventListeners: ['touchstart', 'touchend', 'touchmove', 'touchleave', 'touchcancel']
	  , init: function (options) {
		var instance = options.instance
				, initialScale = 1
				, pannedX = 0
				, pannedY = 0;
		// Init Hammer
		// Listen only for pointer and touch events
		this.hammer = Hammer(options.svgElement, {
		  inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput
		});
		// Enable pinch
		this.hammer.get('pinch').set({enable: true});
		// Handle double tap
		this.hammer.on('doubletap', function (ev) {
		  instance.zoomIn();
		});
		// Handle pan
		this.hammer.on('panstart panmove', function (ev) {
		  // On pan start reset panned variables
		  if (ev.type === 'panstart') {
			pannedX = 0;
			pannedY = 0;
		  }

		  // Pan only the difference
		  instance.panBy({x: ev.deltaX - pannedX, y: ev.deltaY - pannedY});
		  pannedX = ev.deltaX;
		  pannedY = ev.deltaY;
		});
		// Handle pinch
		this.hammer.on('pinchstart pinchmove', function (ev) {
		  // On pinch start remember initial zoom
		  if (ev.type === 'pinchstart') {
			initialScale = instance.getZoom();
			instance.zoom(initialScale * ev.scale);
		  }

		  instance.zoom(initialScale * ev.scale);
		});
		// Prevent moving the page on some devices when panning over SVG
		options.svgElement.addEventListener('touchmove', function (e) {
		  e.preventDefault();
		});
	  }

	  , destroy: function () {
		this.hammer.destroy();
	  }
	};
	svgPanZoomOptions.customEventsHandler = eventsHandler;
  }
// ------------------- 

// init SvgPanZoom object;
  var panZoomMap = svgPanZoom(svgElement, svgPanZoomOptions);

// ==========  Removing transition animation on dragging svg ==================
  var svgIsMouseDown = false;
  $(window).on("mousedown", function () {
	svgIsMouseDown = true;
  });
  $(window).on("mouseup", function () {
	$(".svg-pan-zoom_viewport").removeClass("isMoving");
	svgIsMouseDown = false;
  });
  $("#svg").on("mousemove", function () {
	if (svgIsMouseDown) {
	  $(".svg-pan-zoom_viewport").addClass("isMoving");
	} else {
	  $(".svg-pan-zoom_viewport").removeClass("isMoving");
	  svgIsMouseDown = false;
	}
  });
  $("#svg").on("touchstart", function () {
	$(".svg-pan-zoom_viewport").addClass("isMoving");
  });
  $("#svg").on("touchend", function () {
	$(".svg-pan-zoom_viewport").removeClass("isMoving");
  });
  // --------------------------------------------------------------------------


  // ====== svg path (places) handling =====================
  $(".places").on('doubletap', function () {
	var id = this.id.replace('place-', '');
	$(".svg-pan-zoom_viewport").removeClass("isMoving");
	ActiveAreas(id);
	ZoomAtThis(id);
	SelectThis(id);
	if (isScrollToMobileEnabled) {
	  var $container = $('.map__list');
	  var $scrollTo = $('#link-' + id);
	  $container.animate({
		scrollTop: $scrollTo.offset().top - $container.offset().top + $container.scrollTop()
	  });
	}

  });
  $(".places").on('touchstart', function () {
	var id = this.id.replace('place-', '');
	ActiveAreas(id);
  });
  $(".places").on('mouseenter', function () {
	var id = this.id.replace('place-', '');
	ActiveAreas(id);
  });
  //	 zoom on dbclicked element :
  $(".places").on('dblclick', function () {
	var id = this.id.replace('place-', '');
	ActiveAreas(id);
	ZoomAtThis(id);
	SelectThis(id);
	$(".map__list").scrollTo($('#link-' + id), {duration: 500});
  });
  // ------------------------------------------------------


  // ======== List link handling ================
  $(".svg_link").on('mouseover', function (e) {
	var that = e.target;
	var id = that.id.replace('link-', '');
	ActiveAreas(id);
  });

  $(".svg_link").on('click', function (e) {
	var that = e.target;
	var id = that.id.replace('link-', '');
	ZoomAtThis(id);
	SelectThis(id);
  });
  // ------------------------------------------- 


  // ========================= CONTROLS HANDLING ===============================

  // ========== Displaying ITEMS =============
  $("#showItems").on("click", function () {
	var checkboxValue = $("#showItems:checkbox:checked").is(':checked');
	if (checkboxValue) {
	  $(".items").removeClass("hidden");
	} else {
	  $(".items").addClass("hidden");
	}
  });
  // ---------------------------------------

  var btn_zoomin = $('#bt_zoomin');
  var btn_zoomout = $('#bt_zoomout');
  var btn_reset = $('#bt_reset');

  btn_zoomin.on("click", function () {
	panZoomMap.zoomIn();
  });
  btn_zoomout.on("click", function () {
	panZoomMap.zoomOut();
  });
  btn_reset.on("click", function () {
	panZoomMap.reset();
	panZoomMap.center();
  });

  // ---------------------------------------------------------------------------


  // ========= UPDATING SVG SIZE ON RESIZE ========
  $(window).resize(function () {
	panZoomMap.resize();
	panZoomMap.fit();
	panZoomMap.center();
  });
  // ---------------------------------------


  // =====================================================
  // ============= CUSTOM FUNCTIONS ======================
  // =====================================================
  function ZoomAtThis(id) {
	panZoomMap.resetZoom();
	var target = $("#place-" + id);
	var boundingBox = target[0].getBBox();
	var item_x = boundingBox.x;
	var item_y = boundingBox.y;
	var realZoom = panZoomMap.getSizes().realZoom;
	panZoomMap.pan({
	  x: -(item_x * realZoom) + (panZoomMap.getSizes().width / 2) - (boundingBox.width * realZoom / 2),
	  y: -(item_y * realZoom) + (panZoomMap.getSizes().height / 2) - (boundingBox.height * realZoom / 2)
	});
	panZoomMap.zoomIn();
  }

  function SelectThis(id) {
	// reset isSeleted elements
	$("#application .isSelected").removeClass('isSelected');

	// setting new selected elements
	$('#link-' + id).addClass('isSelected');
	$('#place-' + id).addClass('isSelected');
  }

  function ActiveAreas(id) {
	$('.is-active').removeClass('is-active');
	$('.is-active-parent').removeClass('is-active-parent');
	$('#link-' + id).addClass('is-active');
	$('#place-' + id).addClass('is-active');
	if (isDataLoaded) {
	  thisPlace = SearchPlacesByPathId(id);
	  if (thisPlace) {
		AlertMessage(thisPlace.name);
		var parentId = GetLinkParentId($('#link-' + id));
		if (parentId !== undefined) {
		  $(parentId).addClass('is-active-parent');
		  if (parentId.attr("id") !== undefined) {
			console.log(parentId);
		  }
		}
	  } else {
		AlertMessage("- Données introuvables -");
	  }
	} else {
	  AlertMessage("Chargement");
	}
  }


  function SearchPlacesByPathId(myPathId) {
	if (isDataLoaded) {
	  var result = false;
	  $.each(_PLACES, function (index, value) {
		if (value.pathId == myPathId) {
		  result = value;
		  return result;
		} else if (value.childrenPlaces !== undefined) { // if this place have children
		  $.each(value.childrenPlaces, function (childrenIndex, childrenValue) {
			if (childrenValue.pathId == myPathId) {
			  result = childrenValue;
			  return result;
			}
		  });
		}
	  });
	  return result;
	} else {
	  return false;
	}
  }

  function LoadData() {

	GenerateList($("#svg_link-list"), _PLACES);
	AlertMessage("");


	DisableLoadingMask($(".map__list .loading-mask"));
	$(".map__list").removeClass("loading");
  }


  /**
   * Recursive method to generate links in the svg_link-list
   * 
   * @param {jQuery Element} parent
   * @param {jQuery Object} placesToGenerate
   * @returns {void}
   */
  function GenerateList(parent, placesToGenerate) {
	$.each(placesToGenerate, function (index, value) {
	  if (HasChildren(value)) {
		var newLI = parent.append("<li class='svg_link' id='link-" + value.pathId + "'>" + value.name + "</li>").children("#link-" + value.pathId);
		GenerateList(newLI.append("<ul class='children-place-" + value.pathId + "' id='svg_link-list-" + value.pathId + "' ></ul>").children("#svg_link-list-" + value.pathId), value.childrenPlaces);
	  } else {
		var dataStr = ' data-parentid="' + parent[0].id + '" ';
		parent.append("<li class='svg_link' id='link-" + value.pathId + "'" + dataStr + ">" + value.name + "</li>");
	  }
	});
  }

  function HasChildren(place) {
	return place.childrenPlaces !== undefined;
  }

  function GetLinkParentId($jQelmt) {
	return $("#" + $jQelmt.data("parentid")).parent();
  }

  // ------------------------------------------------
  // ------------ End OF CUSTOM FUNCTION ------------
  // ------------------------------------------------


}); // end of program
