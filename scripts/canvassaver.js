function CanvasSaver(url) {
	
	this.url = url;
	
	this.savePNG = function(cnvs, fname, type) {
		console.log(type);
		if(!cnvs || !url) return;
		fname = fname || 'picture';
		
		var foo = cnvs.toDataURL("image/png");

	    if (foo.length > 502000) {
	        data = cnvs.toDataURL("image/jpeg",0.99);
	    } else {
	        data = cnvs.toDataURL("image/png");
	    }
	    data = data.substr(data.indexOf(',') + 1).toString();
		
		var dataInput = document.createElement("input") ;
		dataInput.setAttribute("name", "imgdata") ;
		dataInput.setAttribute("value", data);
		dataInput.setAttribute("type", "hidden");
		
		var nameInput = document.createElement("input") ;
		nameInput.setAttribute("name", 'name') ;
		nameInput.setAttribute("value", fname + '.png');
		
		var typeInput = document.createElement("input") ;
		typeInput.setAttribute("name", 'type') ;
		typeInput.setAttribute("value", type);
		
		var myForm = document.createElement("form");
		myForm.method = 'post';
		myForm.action = url;
		myForm.appendChild(dataInput);
		myForm.appendChild(nameInput);
		myForm.appendChild(typeInput);
		
		document.body.appendChild(myForm) ;
		myForm.submit() ;
		document.body.removeChild(myForm) ;
	};
	
	this.generateButton = function (label, cnvs, fname) {
		var btn = document.createElement('button'), scope = this;
		btn.innerHTML = label;
		btn.style['class'] = 'canvassaver';
		btn.addEventListener('click', function(){scope.savePNG(cnvs, fname);}, false);
		
		return btn;
	};
}

function decodeBase64Image(dataString) {
	var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
	  response = {};
  
	if (matches.length !== 3) {
	  return new Error('Invalid input string');
	}
  
	response.type = matches[1];
	response.data = new Buffer(matches[2], 'base64');
  
	return response;
  }