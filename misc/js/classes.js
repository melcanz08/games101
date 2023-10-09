class Util {
	static liveSocket = null;

	static ws(url){
		let sok = new WebSocket(url);
		Util.liveSocket = sok;
		sok.onopen = () => {
			console.log('New websocket connection established!');
			Util.liveSocket = sok;
		};

		sok.onclose = (event) => {
	        if (!event.wasClean) {
	            console.log('Connection abruptly closed, Reconnecting...');
	            console.log(sok);
	            setTimeout(()=>{Util.ws("wss://rpsgame2023.onrender.com");},2000);
	            
	        }else{
	        	console.log('Disconnection of websocket from server to client was clean!');
	        }
	    }; 	
	}

	static el(attr,value){
		let elements = document.getElementsByTagName('*');
		let arrElements = Array.from(elements);
		let result = arrElements.find((elem)=>{
			let attrValue = elem.getAttribute(attr);
			return attrValue === value;
		});
		return result;
	} 

	static els(attrib,val){
		let elem = document.getElementsByTagName('*');
		let arrElem = Array.from(elem);
		let arr = [];
		for (var i = arrElem.length - 1; i >= 0; i--) {
			let attrVal = arrElem[i].getAttribute(attrib);
			if(attrVal){
				if(attrVal.indexOf(val) !== -1){
					arr.push(arrElem[i]);
				}
			}
		}
		if(arr.length===0){
 			return false;
		}else{
			return arr;
		}		
	}

	static crel(elem,value){
		let el = document.createElement(elem);
		if(value){
			el.textContent = value;
		}
		return el;
	}

	static wsRequest(socket,data,callback){
		socket.send(JSON.stringify(data));
		socket.onmessage = (event) => {
			console.log('Message received from websocket server: ', JSON.parse(event.data));
			let objData = JSON.parse(event.data);
			if(objData.hasOwnProperty('accountInfo')){
				callback(objData);
			}
			
			if(objData.hasOwnProperty('listOfNamesObject')){
				callback(objData);
			}

			if(objData.type === 'challengerEntry'){
				callback(objData);
			}
		};
	}

    static appendElements(playerListDiv,name, dataKey){
		let mainDiv = document.createElement("div");
		mainDiv.classList.add("d-flex", "justify-content-between", "my-2");
		let nameH6 = document.createElement("h6");
		nameH6.classList.add("my-2");
		nameH6.textContent = name;
		let challengeBtn = document.createElement("button");
		challengeBtn.classList.add("btn", "btn-primary", "btn-sm", "chalBtn");
		challengeBtn.setAttribute("type", "button");
		challengeBtn.setAttribute("data-key", dataKey);
		challengeBtn.textContent = "Challenge";
		mainDiv.appendChild(nameH6);
		mainDiv.appendChild(challengeBtn);
		playerListDiv.appendChild(mainDiv);
	};

	static appendPlayer(playerListDiv,name, dataKey){
		console.log('appendPlayer');
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
        
        const firstContainer = Util.el('id','firstContainer');
        firstContainer.insertBefore(outerDiv, firstContainer.firstChild);
        return true;
    };

   static settingLocalStorageItems(key,value){
    	if(localStorage.getItem(key) === null){
			localStorage.setItem(key, value);
			setTimeout(()=>{
				let dataStored = localStorage.getItem(key);
				if(dataStored){return true;}else{return false;}
			},2000);
		}else{return false;}
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
