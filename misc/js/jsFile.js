import Util from './classes.js';

window.addEventListener('load', function() {

	Util.settingLocalStorageItems('lineExecuted', false);

	Util.ws("wss://rpsgame2023.onrender.com");

	const wsMsgProcessor = (socket)=>{
		let playerListDiv = Util.el('id','playersList');
		let defenderEntry;
		let challengerEntry;
		socket.onmessage = (event) => {
	   		let data = JSON.parse(event.data);
	    	let currentUserName = Util.el('id','userName');
	    	let sessionedUserName;
	    	if(currentUserName){sessionedUserName = currentUserName.textContent;}
	    	let noPlayerElem = Util.el('id','otherPlayer');
			const setEntry=(entry,player,id)=>{
				if(player === 'challenger'){
					let data = { 
                  		type: 'challengerEntry', 
                  		weapon: entry,
                  		defenderID: id
                  	};
                  	socket.send(JSON.stringify(data));
                  
				}else if(player === 'defender'){
					
					let data = { 
                  		type: 'defenderEntry', 
                  		weapon: entry,
                  		challengerID: id
                  	};
                  	socket.send(JSON.stringify(data));
                  	
				} 		
          	};
	        const countdownTimeInSeconds = 10; 
	        const updateTimerDisplay=(seconds)=>{
	            const formattedTime = String(seconds).padStart(2, '0');
	            Util.el('id','timer').textContent = formattedTime;
	        }
	        const startCountdown=(player,id)=>{
	            let secondsLeft = countdownTimeInSeconds;
	            updateTimerDisplay(secondsLeft);
	            const countdownInterval = setInterval(() => {
	                secondsLeft--;
	                if (secondsLeft < 0) {
	                	clearInterval(countdownInterval);
	                	let url = Util.el('id','rpsImage');
	                	let partial = url.getAttribute("src");
	                    let selection = partial.split("/").pop().split(".")[0];
						if(player === "challenger"){
							challengerEntry = selection;
						}else if(player === "defender"){
							defenderEntry = selection;
						}
	                	alert('Time\'s up!',player);
	                	setEntry(selection,player,id);
	                } else {
	                    updateTimerDisplay(secondsLeft);
	                }
	            }, 1000);
	        }

			if(data.type === 'displayOtherUsers'){
		  		let playerListDiv = Util.el('id','playersList');
		  		if(data.playerName !== sessionedUserName){
		  			if(noPlayerElem){
		  				Util.appendElements(playerListDiv,data.playerName, data.userKey);
		  				noPlayerElem.remove();
		  			}else{
		  				const childElements = Array.from(playerListDiv.children);
			  			const foundChild = childElements.find((child) => {
			  				const headerName = child.querySelector('h3').textContent;
		  					return headerName === data.playerName;
			  			});
			  			if(foundChild === undefined){
			  				Util.appendElements(playerListDiv,data.playerName, data.userKey);
			  			}
			  		}
		  		}
		  	}

		  	if(data.removeName === true){
		  		let playerListDiv = Util.el('id','playersList');
		  		if(playerListDiv){
		  			if(playerListDiv.children.length !== 0){
		  				for (let i = 0; i < playerListDiv.children.length; i++) {
							const childElement = playerListDiv.children[i];
							let btnElem = childElement.querySelector('button');
	 						if(btnElem){
							  	if (btnElem.getAttribute('data-key') === data.userKey) {
							    	playerListDiv.removeChild(childElement);
								    if(playerListDiv.childElementCount === 0){
								    	playerListDiv.innerHTML = `<h6 class="text-center text-black-50 my-2" id="otherPlayer" style="display: block;">
					                        no players yet
					                      </h6>`;
								    }
								    break; 
							  	}
						  	}
						}
		  			}
		  		}
		  	}

		  	if(data.type === 'challenge_prompt'){
		    	const response = window.confirm(`You have been challenged by ${data.defenderName}. Accept the challenge?`);
		    	if (response) {
		    		let enemyPlayer = Util.el('id','enemyPlayer');
		    		let mainDivTimer = Util.el('id','mainDivTimer');
		    		let acceptData = {
		    			type: 'challenge_accepted',
		    			challengerName: sessionedUserName,
		    			challengerID: data.challengerID,
		    			defenderID: data.defenderID
		    		}
		    		socket.send(JSON.stringify(acceptData));

		    		let btnArray = Util.els('class','btn');
		    		btnArray.forEach((elem)=>{
		    			elem.disabled = true;
		    		});
				   	alert('You have 10 seconds to make your move by clicking the image! Good Luck!');
				   	if(mainDivTimer){
				   		mainDivTimer.remove();
				   	}
				   	Util.prependTimer();
					enemyPlayer.innerHTML = Util.imgTemplate(data.defenderName);
                  	startCountdown('challenger',data.defenderID);

				}else{
					let declineData = {
		    			type: 'challenge_declined',
					defenderID: data.defenderID
		    		}
		    		socket.send(JSON.stringify(declineData));
				}
		  	}
		  	if(data.type === 'challenge_accepted'){
		  		let mainDivTimer = Util.el('id','mainDivTimer');
		  		alert("Challenge accepted, game will start after closing this prompt, You have 10 seconds to make your move by clicking the image!");
		  		if(mainDivTimer){
			   		mainDivTimer.remove();
			   	}
		  		Util.prependTimer();
		  		enemyPlayer.innerHTML = Util.imgTemplate(data.challengerName);
                startCountdown('defender',data.challengerID);
		  	}
			if(data.type === 'challenge_declined'){
				alert("Challenge was declined by the player, choose another one!");
				let btnArray = Util.els('class','btn');
		    		btnArray.forEach((elem)=>{
		    			elem.disabled = false;
		    		});
			}
		  	const processEntry=(winner,looser)=>{ 
	  			if (winner === looser) {
			        return `<span ><strong><em>It's a tie!</em></strong></span>`;
			    } else if ((winner === 'rock' && looser === 'scissor') ||
			               (winner === 'paper' && looser === 'rock') ||
			               (winner === 'scissor' && looser === 'paper')) {
			        return `<span class="text-success"><strong><em>You won!</em></strong></span>`;
			    } else {
			        return `<span class="text-danger"><strong><em>You lost!</em></strong></span>`;
			    }
	  		}
		  	if(data.type === 'challengerEntry'){	
		  		let enemyDiv = Util.el('id','enemyChoice');
    			if(!defenderEntry){
    			const waitForDefenderEntry = setInterval(()=>{
					if(defenderEntry){
						clearInterval(waitForDefenderEntry);
    					let timer = Util.el('id','timer');
    					let btnArray = Util.els('class','btn');
		    			enemyDiv.innerHTML = `<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
		                	<img src="/assets/images/${data.entry}.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" />
		              	</div>`;
		              	timer.innerHTML = processEntry(defenderEntry,data.entry);
			    		btnArray.forEach((elem)=>{
			    			elem.disabled = false;
			    		});
					}

    			},1000);
			}else{
				let timer = Util.el('id','timer');
				let btnArray = Util.els('class','btn');
    			enemyDiv.innerHTML = `<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
                	<img src="/assets/images/${data.entry}.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" />
              	</div>`;
              	timer.innerHTML = processEntry(defenderEntry,data.entry);

	    		btnArray.forEach((elem)=>{
	    			elem.disabled = false;
	    		});
			}	
		  	}

		  	if(data.type === 'defenderEntry'){
		  		let enemyDiv = Util.el('id','enemyChoice');
		  		if(!challengerEntry){
	              	const waitForChallengerEntry = setInterval(()=>{
						if(challengerEntry){
							clearInterval(waitForChallengerEntry);
							let timer = Util.el('id','timer');
			    					let btnArray = Util.els('class','btn');
			    					enemyDiv.innerHTML = `<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
					                	<img src="/assets/images/${data.entry}.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" />
					              	</div>`;
					              	timer.innerHTML = processEntry(challengerEntry,data.entry);
					              	btnArray.forEach((elem)=>{
						    			elem.disabled = false;
						    		});
						}		
	    			},1000);
				}else{
					let timer = Util.el('id','timer');
					let btnArray = Util.els('class','btn');
					enemyDiv.innerHTML = `<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
	                	<img src="/assets/images/${data.entry}.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" />
	              	</div>`;
	              	timer.innerHTML = processEntry(challengerEntry,data.entry);
	              	btnArray.forEach((elem)=>{
		    			elem.disabled = false;
		    		});
				}
		  	}
		};
	};

	const wsConnInterlock = (socket)=>{
		let updater2 = setInterval(()=>{
			if(socket.readyState === 3){
				clearInterval(updater2);
				setTimeout(()=>{
					wsMsgProcessor(Util.liveSocket);
					wsConnUpdate(Util.liveSocket);
				},5000);
			}
		},3000);
	};

	const wsConnUpdate = (socket)=>{
		let updater = setInterval(()=>{
			if(socket.readyState === 3){
				clearInterval(updater);
				setTimeout(()=>{
					wsMsgProcessor(Util.liveSocket);
					wsConnInterlock(Util.liveSocket);
				},5000);
			}
		},3000);
	};

	let initWsInterlocking = setInterval(()=>{
		if(Util.liveSocket.readyState === 1){
			clearInterval(initWsInterlocking);
			wsMsgProcessor(Util.liveSocket);
			wsConnUpdate(Util.liveSocket);
		}
	},1000);

	let inputName = Util.el('name','name');
	if(inputName){
		let playerNotReady = setInterval(()=>{
			if(Util.liveSocket.readyState === 1){
				clearInterval(playerNotReady);
				Util.liveSocket.send(JSON.stringify({ type: 'playerNotReady'}));
			}
		},1000);

		inputName.onkeydown=(e)=>{
			if(e.keyCode === 32){
				e.preventDefault();
				return false;
			}
		}
	}
		
	const submitForm = Util.el('id','loginForm');
	if(submitForm){
		const regex = /^[\w]{8}$/;
		submitForm.onsubmit=(e)=>{
			e.preventDefault();
			const nameInput = Util.el('name','name');
		    const validationPrompt = Util.el('id','alertText');
		    let uid = localStorage.getItem('uid');
		    // VALIDATION FOR INCORRECT NAME INPUT
		    if (!regex.test(nameInput.value)) {
		      	validationPrompt.innerHTML = `Must be 8 character lowercase letters, numbers and underscore only`;
		    } else {
			// VALIDATION FOR EXISTING ACCOUNT NAMES
		    	let nameData = {type: "checkName", name: nameInput.value, uid: uid};
		    	if(Util.liveSocket.readyState === WebSocket.OPEN){
		    		Util.wsRequest(Util.liveSocket,nameData, (data)=>{
						console.log('data: ',data);
			    		// IF THERES A COOKIE SESSION EXISTED 
			    		if(data.accountInfo.hasName === true){
			    			// IF HAS NAME, COOKIE MATCH AND IP MATCH IN JSON FILE LET THE USER LOGIN THE GAME
			    			if(data.accountInfo.sidMatch === true && data.accountInfo.idMatch === true){
			    				window.location.href = '/';

			    			// IF HAS NAME BUT COOKIE DONT MATCH AND IP DONT MATCH
				    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.idMatch === false
				    			){
				    			validationPrompt.innerHTML = `The name ${data.accountInfo.userName} is already taken, try a different name.`;
				    			
				    		// IF HAS NAME AND COOKIE NOT MATCHED BUT IP MATCHED IN JSON FILE, MEANS THE COOKIE SESSION MAYBE EXPIRED OR DELETED BY THE USER IN THE BROWSER, THEN EDIT THE JSON FILE WITH NEW USER ID AND APPLY THAT NAME AS A NEW ACCOUNT AND LOGGED THE USER IN
				    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.idMatch === true){
								let receivedData = { newUUIDKey: data.accountInfo.newKey };
								const queryParams = Object.entries(receivedData)
									.map(([key, value])=>`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
									.join('&');		
								window.location.href = `/set?${queryParams}`;
							}
			    		}else{
			    			// IF NAME DONT MATCHED AND COOKIE MATCHED OR COOKIE DONT MATCHED BUT IP MATCHED DONT ALLOW TO REGISTER NEW ACCOUNT BECAUSE USER ALREADY HAVE AN ACCOUNT AVAILABLE
				    		if(data.accountInfo.sidMatch === true && data.accountInfo.hasName === false && data.accountInfo.idMatch === true){
				    			validationPrompt.innerHTML = `You already have an account named ${data.accountInfo.userName}, Only one account is allowed.`;
				    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.hasName === false && data.accountInfo.idMatch === true){
				    			validationPrompt.innerHTML = `You already have an account named ${data.accountInfo.userName}, Only one account is allowed.`;

				    		// ELSE NO COOKIE SESSION EXISTED AND NO EXISTING NAME THEN MAKE NEW COOKIE AND NEW ACCOUNT NAME
				    		// HENCE SUBMIT THE FORM TO THE SERVER
				    		}else if(data.accountInfo.sidMatch === false && data.accountInfo.hasName === false && data.accountInfo.idMatch === false){
					    		validationPrompt.innerHTML = ''; 
					      		e.target.submit();
				    		}
				    	}
			    	});    	
		    	}else{
		    		validationPrompt.innerHTML = "There's a problem connecting to the server please try again later!";
		    	}
		    }
		}				
	}

	let playerDiv = Util.el('id','uidtag');
	if(playerDiv){
		let uid = playerDiv.getAttribute("data-uid");
		if(Util.settingLocalStorageItems('uid', uid)){
			playerDiv.removeAttribute("data-uid");
		}else{
			playerDiv.removeAttribute("data-uid");
		}
	}
	
	const playersListBtns = Util.el('id','playersList');
	if(playersListBtns){
	    playersListBtns.onclick = (e)=>{
	    	console.log(e.target.classList);
	    	if(e.target.classList.contains('chalBtn')){
	    		const challengedUserId = e.target.getAttribute('data-key'); // Get challenged user's ID
		      	const defenderID = Util.el('id','userName').getAttribute('data-key');
		      	const defenderName = Util.el('id','userName').textContent;
		      	let enemyPlayerDiv = Util.el('id','enemyPlayer');
		      	
		      	const challengeData = {
		        	type: 'challenge',
		        	challengedUserId,
		        	defenderName,
		        	defenderID
		      	};
		      	if(Util.liveSocket.readyState === WebSocket.OPEN){
		      		Util.liveSocket.send(JSON.stringify(challengeData));
		      		enemyPlayerDiv.innerHTML= `<p class="text-center">Waiting for player response . . .</p>`;
			       	let btnArray = Util.els('class','btn');
		    		btnArray.forEach((elem)=>{
		    			elem.disabled = true;
		    		});
		      	}else{
		      		alert('Server busy please try again later!');
		      	}
	    	}
	    };
	}

	let currentUsersID;
	let nameDiv = Util.el('id','userName');
	if(nameDiv){
		currentUsersID = nameDiv.getAttribute('data-key');
		const displayActiveUser = setInterval(()=>{
			if(Util.liveSocket.readyState === WebSocket.OPEN){
				clearInterval(displayActiveUser);
				if(localStorage.getItem('lineExecuted') === 'false'){
					Util.liveSocket.send(JSON.stringify({ type: 'playerReady', playersID: currentUsersID}));
					localStorage.setItem('lineExecuted', true);	
				}
			}
		}, 1000);		
	}

	function getComputerChoice() {
	    const choices = ['rock', 'paper', 'scissor'];
	    return choices[Math.floor(Math.random() * 3)];
	}

	function determineWinner(player, computer) {
	    if (player === computer) {
	        return `<span ><strong><em>It's a tie!</em></strong></span>`;
	    } else if ((player === 'rock' && computer === 'scissor') ||
	               (player === 'paper' && computer === 'rock') ||
	               (player === 'scissor' && computer === 'paper')) {
	        return `<span class="text-success"><strong><em>You won!</em></strong></span>`;
	    } else {
	        return `<span class="text-danger"><strong><em>Computer won!</em></strong></span>`;
	    }
	}

	// Set the countdown time in seconds
    const cdTimeInSeconds = 10; // Change this to 10 seconds

    // Function to update the timer display
    function utDisplay(seconds) {
        const formattedTime = String(seconds).padStart(2, '0');
        Util.el('id','timer').textContent = formattedTime;
    }

    // Function to start the countdown
    function countDownVsBot(botAnimateMoveID,btnArray) {
        let secondsLeft = cdTimeInSeconds;
        utDisplay(secondsLeft);

        const countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft < 0) {
            	clearInterval(countdownInterval);
            	clearInterval(botAnimateMoveID);
            	let url = Util.el('id','rpsImage');
            	let partial = url.getAttribute("src");
                let selection = partial.split("/").pop().split(".")[0];
            	alert('Time\'s up!');
            	let rpsBotImage = Util.el('id','rpsBotImage');
            	let timer = Util.el('id','timer');
            	const computerChoice = getComputerChoice();
            	rpsBotImage.src = `/assets/images/${computerChoice}.png`;
			    timer.innerHTML = determineWinner(selection,computerChoice);
			    btnArray.forEach((elem)=>{
	    			elem.disabled = false;
	    		});
            	
            } else {
                utDisplay(secondsLeft);
            }
        }, 1000); // Update the timer every 1 second
    }
    
	let botBtn = Util.el('id','bot');
	if(botBtn){
		botBtn.onclick = ()=>{
			let mainDivTimer = Util.el('id','mainDivTimer');
		   	if(mainDivTimer){
		   		mainDivTimer.remove();
		   	}
	      	Util.prependTimer();
    		let enemyPlayerDiv = Util.el('id','enemyPlayer');
    		enemyPlayerDiv.innerHTML = `<div class="container">
            <h3 class="text-center"  id="userName">Computer</h3>
            	<div class="row" id="enemyChoice">
              	<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
                	<img src="/assets/images/rock.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" id="rpsBotImage"/>
              		</div>
        		</div>
      		</div>`;

      		let btnArray = Util.els('class','btn');
    		btnArray.forEach((elem)=>{
    			elem.disabled = true;
    		});

      		let currentImageIndex = 0;
			let images = [
				"/assets/images/rock.png",
				"/assets/images/paper.png",
				"/assets/images/scissor.png"
				// Add more image paths as needed
			];

			let rpsBotImage = Util.el('id','rpsBotImage');
	      	let botAnimateMove = setInterval(()=>{
	      		currentImageIndex = (currentImageIndex + 1) % images.length;
				rpsBotImage.src = images[currentImageIndex];
	      	},1000);
			countDownVsBot(botAnimateMove, btnArray);
		}
	}

	let logoutLink = Util.el('href','/logout');
	if(logoutLink){
		logoutLink.onclick=()=>{
			localStorage.setItem('lineExecuted', 'false');
		}
	}
	const rpsImage = Util.el('id','rpsImage');
	if(rpsImage){
		let currentImageIndex = 0;
		const images = [
			"/assets/images/rock.png",
			"/assets/images/paper.png",
			"/assets/images/scissor.png"
			// Add more image paths as needed
		];
		rpsImage.addEventListener("click", function () {
			currentImageIndex = (currentImageIndex + 1) % images.length;
			rpsImage.src = images[currentImageIndex];
		});
	}

	console.log('Page loaded!');
});
