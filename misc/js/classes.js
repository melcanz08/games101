class Util {
	static tag(tagname,attrName,val){
		let result;
		let elem = document.getElementsByTagName(tagname);
		for(let i=0; i<elem.length; i++){
			if(elem[i].getAttribute(attrName) == val){
				result = elem[i];
				break;
			}
		}
		return result;
	}
	static arrOftags(elem,tagName){
		let arr;
		let x = document.querySelector(elem);
		if(x){
			arr = x.getElementsByTagName(tagName);
		}
		return arr;
	} 
	static checkErrStatus(res){
		console.log(res);
		if (res.ok == true){
			return res.json();
		}else{
			throw Error(res.error());
		}
	}
	static wsSend(socket,sendData,callback){
		console.log('sending data!');
		socket.send(JSON.stringify(sendData));

		socket.onmessage = event => {
			const dataObjReceived = JSON.parse(event.data);
			console.log('responce data from server', dataObjReceived);

			if(dataObjReceived.hasOwnProperty('nameExistAndSid')){
				callback(dataObjReceived);
			}
			
			if(dataObjReceived.hasOwnProperty('listOfNamesObject')){
				callback(dataObjReceived);
			}

			if(dataObjReceived.type === 'challengerEntry'){
				callback(dataObjReceived);
			}
			
		};
	}

	// FOR VALIDATION ON USERS ACCOUNT STATUS
	static validationWSResponse(socket,checkNameAndSid,validationPrompt,name){
		Util.wsSend(socket,checkNameAndSid, (data)=>{
    		console.log('data received submit form:', data);
    		// IF THERES A COOKIE SESSION EXISTED 
    		if(data.haveSid === true){
    			// IF HAS COOKIE BUT THE NAME DONT MATCH IN JSON FILE
    			if(data.nameExistAndSid.hasName === true && 
	    			data.nameExistAndSid.sidMatch === false){
	    			validationPrompt.innerHTML = `The name ${name} is already been taken, try another name.`;
	    		// IF HAS COOKIE AND THE NAME MATCHED IN JSON FILE LET THE USER LOGIN THE GAME
	    		}else if(data.nameExistAndSid.hasName === true && data.nameExistAndSid.sidMatch === true){
	    			console.log("user exist!");
	    			window.location.href = '/main';
	    		// IF HAS COOKIE AND NO NAME MATCHED IN JSON FILE DONT ALLOW TO REGISTER NEW ACCOUNT COZ THERE SHOULD BE AN ACCOUNT IF COOKIE EXISTED 
	    		}else if(data.nameExistAndSid.hasName === false && data.nameExistAndSid.hasOwnProperty('existedName')){
	    			validationPrompt.innerHTML = `You already have an account named ${data.nameExistAndSid.existedName}, you cannot create new account.`;
	    		// IF HAS COOKIE AND NO NAME MATCHED IN JSON AND THE NAMED ENTERED WAS NOT AVAILABLE IN JSON FILE SUBMIT THE FORM
	    		}else if(data.nameExistAndSid.hasName === false && !data.nameExistAndSid.hasOwnProperty('existedName')){
	    			e.target.submit();
	    		}
	    	// ELSE IF NO COOKIE SESSION EXISTED BUT HAS NAME MATCHED IN JSON FILE, MEANS THE COOKIE SESSION EXPIRED OR THE USER DELETED COOKIE IN THE BROWSER, THEN EDIT THE JSON FILE WITH NEW USER ID AND APPLY THAT NAME AS A NEW ACCOUNT. 
    		}else if(data.haveSid === false && data.nameExistAndSid.hasName === true){
				let receivedData = { newUUIDKey: data.nameExistAndSid.newKey };
				const queryParams = Object.entries(receivedData)
					.map(([key, value])=>`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
					.join('&');
					console.log(queryParams);
				window.location.href = `/main?${queryParams}`;
    		// ELSE NO COOKIE SESSION EXISTED AND NO EXISTING NAME THEN MAKE NEW COOKIE AND NEW ACCOUNT NAME
    		// HENCE SUBMIT THE FORM TO THE SERVER
    		}else{
	    		validationPrompt.innerHTML = ''; 
	      		e.target.submit();
    		}
    	});
	};

	static playerRegistryValidation(socket,regex){
	    const nameInput = Util.tag('input','name','name');
	    const validationPrompt = Util.tag('p','id','alertText');
	    // VALIDATION FOR INCORRECT NAME INPUT
	    if (!regex.test(nameInput.value)) {
	      	validationPrompt.innerHTML = `Must be 8 characters lowercase letters, numbers and underscore only`;
	    } else {
		// VALIDATION FOR EXISTING ACCOUNT NAMES
	    	let checkNameAndSid = {checkName: true, name: nameInput.value};
	    	if(socket.readyState === WebSocket.OPEN){
	    		Util.validationWSResponse(socket,checkNameAndSid,validationPrompt,nameInput.value);	    	
	    	}else{
	    		validationPrompt.innerHTML = "There's a problem connecting to the server please try again later!";
	    	}
	    }
		 
    };

    static appendElements(playerListDiv,name, dataKey){
		console.log('Na trigger na ang appendElements nga function!');
		let mainDiv = document.createElement("div");
		mainDiv.classList.add("d-flex", "justify-content-between", "my-2");
		let nameH6 = document.createElement("h6");
		nameH6.classList.add("my-2");
		nameH6.textContent = name;
		let challengeBtn = document.createElement("button");
		challengeBtn.classList.add("btn", "btn-success", "btn-sm");
		challengeBtn.setAttribute("type", "button");
		challengeBtn.setAttribute("data-key", dataKey);
		challengeBtn.textContent = "Challenge";
		mainDiv.appendChild(nameH6);
		mainDiv.appendChild(challengeBtn);
		playerListDiv.appendChild(mainDiv);
	};

	static appendPlayer(playerListDiv,name, dataKey){
		console.log('Na trigger na ang appendElements nga function!');
		let mainDiv = document.createElement("div");
		mainDiv.classList.add("d-flex", "justify-content-between", "my-2");
		let nameH6 = document.createElement("h6");
		nameH6.classList.add("my-2");
		nameH6.textContent = name;
		let challengeBtn = document.createElement("button");
		challengeBtn.classList.add("btn", "btn-success", "btn-sm");
		challengeBtn.setAttribute("type", "button");
		challengeBtn.setAttribute("data-key", dataKey);
		challengeBtn.textContent = "Challenge";
		mainDiv.appendChild(nameH6);
		mainDiv.appendChild(challengeBtn);
		playerListDiv.appendChild(mainDiv);
	};

	static prependTimer(){
        const outerDiv = document.createElement('div');
        outerDiv.classList.add("container", "text-center");
        outerDiv.setAttribute("id", "mainDivTimer");
        const innerDiv = document.createElement('div');
        innerDiv.className = 'display-4';
        innerDiv.setAttribute("id", "timer");
        innerDiv.textContent = 10;
        outerDiv.appendChild(innerDiv);

        const firstContainer = Util.tag('div','id','firstContainer');
        firstContainer.insertBefore(outerDiv, firstContainer.firstChild);
    };

    static settingLocalStorageItems(){
    	if(localStorage.getItem('lineExecuted') === null){
			localStorage.setItem('lineExecuted', false);
		}
    }

    static playerReady(socket,id){
		if(localStorage.getItem('lineExecuted') === 'false'){
			socket.send(JSON.stringify({ type: 'playerReady', playersID: id}));
			console.log('ready to play: ');
			
			localStorage.setItem('lineExecuted', true);
			console.log('lineExecuted: ', localStorage.getItem('lineExecuted'));
			
		}

    }

    static imgTemplate(name){
    	return `<div class="container">
            <h3 class="text-center"  id="userName">${name}</h3>
            	<div class="row" id="enemyChoice">
              	<p class="text-center">Waiting for other player's move!</p>
        	</div>
      	</div>`;
    }
}

export default Util;