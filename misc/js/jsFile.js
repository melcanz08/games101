import Util from './classes.js';

window.addEventListener('load', function() {

	Util.settingLocalStorageItems();
	console.log('lineExecuted: ', localStorage.getItem('lineExecuted'));

	let webSocket=null;
	const ws = ()=>{
		webSocket = new WebSocket('ws://localhost:4001');
		webSocket.onopen = () => {
	        console.log('WebSocket connection established!');

	        // INDEX.HTML VALIDATION FOR USERS INPUT
			const submitForm = Util.tag('form','id','loginForm');
			if(submitForm){
				const regex = /^[\w]{8}$/;
				submitForm.onsubmit=(e)=>{
					e.preventDefault();
					Util.playerRegistryValidation(webSocket,regex);
				}				
			}

			// INDEX.HTML WHEN USER GOES TO HOMEPAGE PLAYER WILL NOT BE SHOWN ON PLAYERLIST VIA WEBSOCKET PROCESS
			const inputName = Util.tag('input','name','name');
			if(inputName){
				webSocket.send(JSON.stringify({ type: 'playerNotReady'}));
				console.log('not ready to play: ');
			}
			
			// MAIN.EJS - CHALLENGING PLAYERS IN THE GAME
			const challengeButtons = Util.arrOftags('#playersList','button');
			if(challengeButtons){
				const buttonsArray = [...challengeButtons];
				buttonsArray.forEach((button) => {
				    button.onclick = (e)=> {
				      	const challengedUserId = e.target.getAttribute('data-key'); // Get challenged user's ID
				      	const defenderID = Util.tag('h3','id','userName').getAttribute('data-key');
				      	const defenderName = Util.tag('h3','id','userName').textContent;
				      	let enemyPlayerDiv = Util.tag('div','id','enemyPlayer');
				      	
				      	console.log(challengedUserId);
				      	const challengeData = {
				        	type: 'challenge',
				        	challengedUserId,
				        	defenderName,
				        	defenderID
				      	};

				      	webSocket.send(JSON.stringify(challengeData));
				       	enemyPlayerDiv.innerHTML= `<p class="text-center">Wait for player response . . .</p>`;
				       	let btnArray = document.querySelectorAll(".btn");
			    		btnArray.forEach((elem)=>{
			    			elem.disabled = true;
			    		});
				    };
				});
			}

			// MAIN.EJS WHEN OTHER PLAYERS ONLINE - SHOW IN THE PLAYER NAME IN THE PLAYER LIST WEBSOCKET PROCESS
			let currentUsersID;
			let nameDiv = Util.tag('h3','id','userName');
			if(nameDiv){
				currentUsersID = nameDiv.getAttribute('data-key');
			}
			const playerListDiv = Util.tag('div','id','playersList');
			if(playerListDiv){
				Util.playerReady(webSocket,currentUsersID);
			}
				

			let defenderEntry;
			let challengerEntry;
	        webSocket.onmessage = event => {
		    	let data = JSON.parse(event.data);
				console.log('data received from ready player: ',event.data);

		    	let currentUserName = Util.tag('h3','id','userName');
		    	let sessionedUserName;
		    	if(currentUserName){sessionedUserName = currentUserName.textContent;}
		    	let noPlayerElem = Util.tag('h6','id','otherPlayer');
				
				const setEntry=(entry,player,id)=>{
					if(player === 'challenger'){
						
						let data = { 
	                  		type: 'challengerEntry', 
	                  		weapon: entry,
	                  		defenderID: id
	                  	};
	                  	webSocket.send(JSON.stringify(data));
	                  
					}else{
						
						let data = { 
	                  		type: 'defenderEntry', 
	                  		weapon: entry,
	                  		challengerID: id
	                  	};
	                  	webSocket.send(JSON.stringify(data));
	                  	
					} 		
              	};

              	// Set the countdown time in seconds
		        const countdownTimeInSeconds = 10; // Change this to 10 seconds

		        // Function to update the timer display
		        function updateTimerDisplay(seconds) {
		            const formattedTime = String(seconds).padStart(2, '0');
		            document.getElementById('timer').textContent = formattedTime;
		        }

		        // Function to start the countdown
		        function startCountdown(player,id) {
		            let secondsLeft = countdownTimeInSeconds;
		            updateTimerDisplay(secondsLeft);

		            const countdownInterval = setInterval(() => {
		                secondsLeft--;
		                if (secondsLeft < 0) {
		                	clearInterval(countdownInterval);

		                	let url = Util.tag('img','id','rpsImage');
		                	let partial = url.getAttribute("src");
		                    let selection = partial.split("/").pop().split(".")[0];

		                	if(player === "challenger"){
		                		challengerEntry = selection;
		                		console.log('setEntry function challengerEntry: ',challengerEntry);
		                	}else{
		                		defenderEntry = selection;
		                		console.log('setEntry function defenderEntry: ',defenderEntry);
		                	}

		                	alert('Time\'s up!');
		                	setEntry(selection,player,id);
		                } else {
		                    updateTimerDisplay(secondsLeft);
		                }
		            }, 1000); // Update the timer every 1 second
		        }

				if(data.type === 'displayOtherUsers'){
			  		console.log('Pero na receive kaya ang data: ',data);
			  		if(data.playerName !== sessionedUserName){
			  			console.log('sessionedUserName: ',sessionedUserName);
			  			console.log('data.playerName: ',data.playerName);
			  			Util.appendElements(playerListDiv,data.playerName, data.userKey);
			  			if(noPlayerElem){
			  				noPlayerElem.remove();
			  			}
			  			
			  		}
			  	}

			  	if(data.removeName === true){
			  		if(playerListDiv){
			  			if(playerListDiv.children.length !== 0){
			  				for (let i = 0; i < playerListDiv.children.length; i++) {
								const childElement = playerListDiv.children[i];
								let btnElem = childElement.querySelector('button');
		 						if(btnElem){
								  	if (btnElem.getAttribute('data-key') === data.userKey) {
								  	
								    // Remove the matching child element
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
			    		let enemyPlayer = Util.tag('div','id','enemyPlayer');
			    		let mainDivTimer = Util.tag('div','id','mainDivTimer');
			    		let acceptData = {
			    			type: 'challenge_accepted',
			    			challengerName: sessionedUserName,
			    			challengerID: data.challengerID,
			    			defenderID: data.defenderID
			    		}
			    		webSocket.send(JSON.stringify(acceptData));
			    		let btnArray = document.querySelectorAll(".btn");
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
			    			challenger: data.challenger
			    		}
			    		Util.wsSend(webSocket,declineData, (data)=>{
			    			
			    		});	
					}
			  	}
			  	if(data.type === 'challenge_accepted'){
			  		let mainDivTimer = Util.tag('div','id','mainDivTimer');
			  		alert("Challenge accepted, game will start after closing this prompt, You have 10 seconds to make your move by clicking the image!");
			  		if(mainDivTimer){
				   		mainDivTimer.remove();
				   	}
			  		Util.prependTimer();
			  		enemyPlayer.innerHTML = Util.imgTemplate(data.challengerName);
                    startCountdown('defender',data.challengerID);
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
			  		console.log('challengerEntry: ',data);
			  		let enemyDiv = Util.tag('div','id','enemyChoice');
			  		
	    			console.log('defenderEntry: ',defenderEntry);
	    			const waitForDefenderEntry = setInterval(()=>{
	    				if(defenderEntry!==undefined){
	    					clearInterval(waitForDefenderEntry);
	    					let timer = Util.tag('div','id','timer');
	    					let btnArray = document.querySelectorAll(".btn");
			    			enemyDiv.innerHTML = `<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
			                	<img src="/assets/images/${data.entry}.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" />
			              	</div>`;
			              	timer.innerHTML = processEntry(defenderEntry,data.entry);

				    		btnArray.forEach((elem)=>{
				    			elem.disabled = false;
				    		});
	    				}
	    				console.log('waiting for challenger move!');
	    			},1000);
			  		
			  	}

			  	if(data.type === 'defenderEntry'){
			  		console.log('defenderEntry: ',data);
			  		let enemyDiv = Util.tag('div','id','enemyChoice');
			  		
	              	console.log('challengerEntry: ',challengerEntry);
	              	const waitForChallengerEntry = setInterval(()=>{
	    				if(challengerEntry!==undefined){
	    					clearInterval(waitForChallengerEntry);
	    					let timer = Util.tag('div','id','timer');
	    					let btnArray = document.querySelectorAll(".btn");
	    					enemyDiv.innerHTML = `<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
			                	<img src="/assets/images/${data.entry}.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" />
			              	</div>`;
			              	timer.innerHTML = processEntry(challengerEntry,data.entry);
			              	btnArray.forEach((elem)=>{
				    			elem.disabled = false;
				    		});
	    				}
	    				console.log('waiting for defender move!');
	    			},1000);
			  		
			  	}
			};
	    };
	    webSocket.onclose = (event) => {
	        if (!event.wasClean) {
	            console.log('Connection abruptly closed, Reconnecting...');
	            setTimeout(()=>{ws();},1000);
	            
	        }else{
	        	console.log('Disconnection of websocket from server to client was clean!');
	        }
	    }; 
	}
	
	if(webSocket === null){
		ws();
	}
	

	// INDEX.HTML SPACE IN INPUT FIELD NAME IN INDEX.HTML NOT ALLOWED
	const inputName = Util.tag('input','name','name');
	if(inputName){
		inputName.onkeydown=(e)=>{
			if(e.keyCode === 32){
				e.preventDefault();
				return false;
			}
		}
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
        document.getElementById('timer').textContent = formattedTime;
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

            	let url = Util.tag('img','id','rpsImage');
            	let partial = url.getAttribute("src");
                let selection = partial.split("/").pop().split(".")[0];
                
            	alert('Time\'s up!');
            	
            	let rpsBotImage = Util.tag('img','id','rpsBotImage');
            	let timer = Util.tag('div','id','timer');
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

	let botBtn = Util.tag('button','id','bot');
	if(botBtn){
		botBtn.onclick = ()=>{

			let mainDivTimer = Util.tag('div','id','mainDivTimer');
		   	if(mainDivTimer){
		   		mainDivTimer.remove();
		   	}

			// INSERT THE TIMER TEXT WHICH IN THIS CASE STARTS AT 10
	      	Util.prependTimer();
			
			// REPLACE IMAGE AND NAME IN ENEMY DIV
    		let enemyPlayerDiv = Util.tag('div','id','enemyPlayer');
    		enemyPlayerDiv.innerHTML = `<div class="container">
            <h3 class="text-center"  id="userName">Computer</h3>
            	<div class="row" id="enemyChoice">
              	<div class="col-xs-1 col-sm-4 col-md-4 col-lg-4 mx-auto text-center">
                	<img src="/assets/images/rock.png" class="rounded-circle mx-auto" style="height: 100px; width: 130px;" id="rpsBotImage"/>
              		</div>
        		</div>
      		</div>`;

      		// DISABLE ALL BUTTON WHEN BOT BUTTON WAS CLICK
      		let btnArray = document.querySelectorAll(".btn");
    		btnArray.forEach((elem)=>{
    			elem.disabled = true;
    		});

    		// ANIMATE COMPUTER MOVE EVERY 1 SECOND
      		let currentImageIndex = 0;
			let images = [
				"/assets/images/rock.png",
				"/assets/images/paper.png",
				"/assets/images/scissor.png"
				// Add more image paths as needed
			];

			let rpsBotImage = Util.tag('img','id','rpsBotImage');
	      	let botAnimateMove = setInterval(()=>{
	      		currentImageIndex = (currentImageIndex + 1) % images.length;
				rpsBotImage.src = images[currentImageIndex];
	      	},1000);

	      	// RUN THE TIMER AND REVEAL GAME RESULT
			countDownVsBot(botAnimateMove, btnArray);
		}
	}

	// MAIN.EJS setting the localstorage item "lineExecuted" to false when logout cliccked
	let logoutLink = Util.tag('a','href','/logout');
	if(logoutLink){
		logoutLink.onclick=()=>{
			localStorage.setItem('lineExecuted', 'false');
		}
	}

	// MAIN.EJS WHEN IMG ELEMENT IS CLICKED CHANGE THE IMAGE SOURCE
	const rpsImage = Util.tag('img','id','rpsImage');
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