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
		
		if (res.ok == true){
			return res.json();
		}else{
			throw Error(res.error());
		}
	}
	static wsSend(socket,sendData,callback){
		
		socket.send(JSON.stringify(sendData));

		socket.onmessage = (event) => {
			const dataObjReceived = JSON.parse(event.data);
			console.log("data from server: ",dataObjReceived);
			if(dataObjReceived.hasOwnProperty('accountInfo')){
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
	static validationWSResponse(form,socket,nameData,validationPrompt,name){
		Util.wsSend(socket,nameData, (data)=>{
			console.log('data: ',data);
    		// IF THERES A COOKIE SESSION EXISTED 
    		if(data.accountInfo.hasName === true){
    			// IF HAS NAME, COOKIE MATCH AND IP MATCH IN JSON FILE LET THE USER LOGIN THE GAME
    			if(data.accountInfo.sidMatch === true && data.accountInfo.ipMatch === true){
    				window.location.href = '/';

    			// IF HAS NAME BUT COOKIE DONT MATCH AND IP DONT MATCH
	    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.ipMatch === false
	    			){
	    			validationPrompt.innerHTML = `The name ${name} is already taken, try a different name.`;
	    			
	    		// IF HAS NAME AND COOKIE NOT MATCHED BUT IP MATCHED IN JSON FILE, MEANS THE COOKIE SESSION MAYBE EXPIRED OR DELETED BY THE USER IN THE BROWSER, THEN EDIT THE JSON FILE WITH NEW USER ID AND APPLY THAT NAME AS A NEW ACCOUNT AND LOGGED THE USER IN
	    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.ipMatch === true){
					let receivedData = { newUUIDKey: data.accountInfo.newKey };
					const queryParams = Object.entries(receivedData)
						.map(([key, value])=>`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
						.join('&');
						
					window.location.href = `/set?${queryParams}`;
				}

    		}else{
    			// IF NAME DONT MATCHED AND COOKIE MATCHED OR COOKIE DONT MATCHED BUT IP MATCHED DONT ALLOW TO REGISTER NEW ACCOUNT BECAUSE USER ALREADY HAVE AN ACCOUNT AVAILABLE
	    		if(data.accountInfo.sidMatch === true && data.accountInfo.hasName === false && data.accountInfo.ipMatch === true){
	    			validationPrompt.innerHTML = `You already have an account named ${data.accountInfo.userName}, Only one account is allowed.`;
	    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.hasName === false && data.accountInfo.ipMatch === true){
	    			validationPrompt.innerHTML = `You already have an account named ${data.accountInfo.userName}, Only one account is allowed.`;

	    		// ELSE NO COOKIE SESSION EXISTED AND NO EXISTING NAME THEN MAKE NEW COOKIE AND NEW ACCOUNT NAME
	    		// HENCE SUBMIT THE FORM TO THE SERVER
	    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.hasName === false && data.accountInfo.ipMatch === false){
		    		validationPrompt.innerHTML = ''; 
		      		form.submit();
	    		}
	    	}
    	});
	};

	static playerRegistryValidation(form,socket,regex){
	    const nameInput = Util.tag('input','name','name');
	    const validationPrompt = Util.tag('p','id','alertText');
	    // VALIDATION FOR INCORRECT NAME INPUT
	    if (!regex.test(nameInput.value)) {
	      	validationPrompt.innerHTML = `Must be 8 character lowercase letters, numbers and underscore only`;
	    } else {
		// VALIDATION FOR EXISTING ACCOUNT NAMES
	    	console.log("websocket: ",socket);
	    	let nameData = {type: "checkName", name: nameInput.value};
	    	if(socket.readyState === WebSocket.OPEN){
	    		Util.validationWSResponse(form,socket,nameData,validationPrompt,nameInput.value);	    	
	    	}else{
	    		validationPrompt.innerHTML = "There's a problem connecting to the server please try again later!";
	    	}
	    }
		 
    };

    static appendElements(playerListDiv,name, dataKey){
		let mainDiv = document.createElement("div");
		mainDiv.classList.add("d-flex", "justify-content-between", "my-2");
		let nameH6 = document.createElement("h6");
		nameH6.classList.add("my-2");
		nameH6.textContent = name;
		let challengeBtn = document.createElement("button");
		challengeBtn.classList.add("btn", "btn-primary", "btn-sm");
		challengeBtn.setAttribute("type", "button");
		challengeBtn.setAttribute("data-key", dataKey);
		challengeBtn.textContent = "Challenge";
		mainDiv.appendChild(nameH6);
		mainDiv.appendChild(challengeBtn);
		playerListDiv.appendChild(mainDiv);
	};

	static appendPlayer(playerListDiv,name, dataKey){
		
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
			
			localStorage.setItem('lineExecuted', true);
			
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

