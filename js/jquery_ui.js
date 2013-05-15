  $(document).ready(function() {
  
    $("#specDialog").dialog({
    	bgiframe: true,
    	autoOpen: false,
    	width: 500,
		closeOnEscape: true,
        show: 'fade',
        hide: 'fade',
        position: 'center',
    	stack: false,
    	buttons: {
    		OK: function() {
    	        $("#dialog > form").submit();
    		  	$(this).dialog('close');
    		  	isOpen = false;
    		},
    		Abbrechen: function() {
    			$(this).dialog('close');
    			isOpen = false;
    		}
    	}
    });
    $('#specSettings').click(function() {
    	isOpen = $('#specDialog').dialog('isOpen');
    	if(!isOpen) {
    		$('#specDialog').dialog('open');
    		$("#specDialog").dialog('moveToTop'); 
    		isOpen = true;
    	}
    	else {
    		$('#specDialog').dialog('close');
    		isOpen = false;
    	}
    });
  }); 