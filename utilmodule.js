const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const WebSocket = require('ws');

const wsPort = 4001; // Using port 4001 for WebSocket server

let clients = {};

const webSocketConnections=()=>{

	// Create a WebSocket server instance
	const wss = new WebSocket.Server({ port: wsPort });
	
	// Handle incoming websocket connections
	wss.on('connection', (conn, req) => {
		console.log('New client connected on the websocket server');
		

		const cookies = parseCookies(req.headers.cookie);
		let sid = cookies.sessidrps;

		clients[sid] = conn;
		
		let name = getUserName(sid);

		let arrayOfSid = [];
		let activePlayers = getAllUserActive(sid);
		
		if(activePlayers){
			for(const propertyKey in activePlayers){
				arrayOfSid.push(propertyKey);
			}
		}
		
	
		// Handle messages from the client
		conn.on('message', message => {
			
			let data = JSON.parse(message.toString());
			let responseObject={};
			
			if(data.hasOwnProperty('checkName')){
				
				let haveSid;
				let userName;
				let cookieValue;
				
				if(sid){
					userName = getUserName(sid);
					haveSid = true;
				}else{
					
					haveSid = false;
				}

				let nameExistAndSid = checkNameIfExist(data.name,sid);
				
				responseObject.nameExistAndSid = nameExistAndSid;
				responseObject.haveSid = haveSid;
				responseObject.userName = userName;
				
				conn.send(JSON.stringify(responseObject));
			}

			if(data.hasOwnProperty('checkCookie')){
				const cookies = parseCookies(req.headers.cookie);
				let sid = cookies.sessidrps;
				
				if(sid){
					responseObject = {hasCookie:true};
					
					conn.send(JSON.stringify(responseObject));
				}else{
					responseObject = {hasCookie:false};
					
					conn.send(JSON.stringify(responseObject));
				}
			}

			if(data.type === 'playerReady'){
				console.log('the player ready is: ',sid);
				console.log('data received in server: ',data);
				setTimeout(()=>{
					
					Object.keys(clients).forEach((clientID)=>{
						if(clientID !== data.playersID){
							clients[clientID].send(JSON.stringify({ type: 'displayOtherUsers', userKey: sid, playerName: name}));
						}
					});

				},5000);	
			}

			if(data.type === 'playerNotReady'){
				console.log('data received in server: ',data);
				setTimeout(()=>{
					Object.keys(clients).forEach((clientID)=>{
						if(clientID !== sid){
							clients[clientID].send(JSON.stringify({removeName: true, userKey: sid}));
						}
					});
				},2000);	
			}

			if (data.type === 'challenge') {
				console.log('Data object recieve in server: ', data);
		    const targetUser = clients[data.challengedUserId];

		    if (targetUser) {
		      // Send challenge request to the target user
		      targetUser.send(JSON.stringify({ type: 'challenge_prompt', defenderID: data.defenderID, defenderName: data.defenderName, challengerID: data.challengedUserId}));
		    }else{
		    	console.log('User not connected in websocket', targetUser);
		    }
		  }

		  if(data.type === 'challenge_accepted'){
		  	console.log('challenge accepted! ', data.challengerID);
		  	const defenderSocket = clients[data.defenderID];
	      if (defenderSocket) {
	        defenderSocket.send(JSON.stringify({ type: 'challenge_accepted', challengerName: data.challengerName, challengerID: data.challengerID}));
	        // Start the game here
	      }
		  }

		  if(data.type === 'challenge_declined'){
		  	console.log('challenge declined!');
		  	const challengerSocket = clients[data.defenderID];
	      if (challengerSocket) {
	        challengerSocket.send(JSON.stringify({ type: 'challenge_accepted' }));
	        // Start the game here
	      }
		  }
		  

		  if(data.type === 'challengerEntry'){
		  	console.log('challenger entry received: ', data);
		  	clients[data.defenderID].send(JSON.stringify({ type: 'challengerEntry', entry: data.weapon}));
		  }

		  if(data.type === 'defenderEntry'){
		  	console.log('defenderEntry entry received: ', data);
		  	clients[data.challengerID].send(JSON.stringify({ type: 'defenderEntry', entry: data.weapon}));
		  }


		});

		// Handle client disconnection
	  conn.on('close', () => {
	    console.log('Client disconnected');
	  });
	});
}

const sessionedUser=(res,sid)=>{
	const readStream = fs.createReadStream(`${__dirname}/misc/ejs/main.ejs`, 'utf8');

	let userName = getUserName(sid);
	let activeUser = getAllUserActive(sid);
	let htmlData = '';

  readStream.on('data', (chunk) => {
    htmlData += chunk;
    console.log('on data',htmlData);
  });



  readStream.on('end', () => {
  	console.log('on end',htmlData);
		const renderedHtmlData = ejs.render(htmlData, {
			currentUsersId: sid,
			userName: userName,
			activeUser: activeUser
    });
    
    console.log('sessionedUser function: EJS template engine works!');

    // Send the rendered html string
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderedHtmlData);
  });

  readStream.on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  });
}

const serverResponseHeader=(res,filePath)=>{
		let urlExtension = path.extname(filePath).toLowerCase();
		res.writeHead(200,{'Content-Type': contentSpecifier(urlExtension)});
		fs.createReadStream(filePath).pipe(res);
}

const checkUserStatus=(sid)=>{
	let insideSidJson = loadsessIDFromJSON();
	const arrayOfObjects = Object.entries(insideSidJson).map(([key, obj]) => ({ [key]: obj }));
	let userDetails = arrayOfObjects.find(obj => sid in obj);
	if(userDetails){
		if(userDetails[sid].status){
			return true;
		}else{
			return false;
		}
	}else{
		return false;
	}
}

const parseCookies=(cookieHeader)=>{
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
    	if(cookie.indexOf('sessidrps') !== -1){
    		const parts = cookie.split('=');
      	cookies[parts[0].trim()] = parts[1].trim();
      }  
    });
  }
  return cookies;
}

// Generate a random UUID (version 4
const generateSessionToken=()=>{
  // This requires the 'uuid' package, install it using 'npm install uuid'
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

const loadsessIDFromJSON = () => {
	let actualData;
  try {
	  const data = fs.readFileSync('sid.json', 'utf8');
	  
	  actualData = JSON.parse(data);
	} catch (err) {
	 
	}
	return actualData;
};

const getUserName=(sid)=>{
		let insideSidJson = loadsessIDFromJSON();
		let userDetails;
		let userDetailValues;
		if(insideSidJson){
			let arrOfObjects =  Object.entries(insideSidJson).map(([key, value]) => ({ [key]: value }));
			
			if (arrOfObjects.length === 0) {
			  return;
			} else {
			  userDetails = arrOfObjects.find(obj => sid in obj);
			  if(userDetails){
			  	userDetailValues = Object.values(userDetails);
					return userDetailValues[0].name;
			  }else{
			  	return;
			  }
			}
		}return;
}

const getAllUserActive = (sid)=>{
	let insideSidJson = loadsessIDFromJSON();
	if(insideSidJson){
		let objectNames = {};
		for(let key in insideSidJson){
			if(insideSidJson[key].status === true && key !== sid){
				objectNames[key] = insideSidJson[key];
			}
		}
		return objectNames;
	}
}

const getAllUserName=(sid)=>{
	let insideSidJson = loadsessIDFromJSON();
	
	if(insideSidJson){
		let arrOfObjects =  Object.entries(insideSidJson).map(([key, value]) => ({ [key]: value }));
		
		for(const key in arrOfObjects){
			
			if(arrOfObjects[key].hasOwnProperty(sid)){
				delete arrOfObjects[key];
			}
		}
		
		const plainObjectData = arrOfObjects.reduce((acc, obj) => {
			  const key = Object.keys(obj)[0];
			  acc[key] = obj[key];
			  return acc;
			}, {});
		  return plainObjectData;	
	}
}

const checkNameIfExist=(name,sid)=>{
	let insideJsonFile=loadsessIDFromJSON(fs);
	let hasName;
	let sidMatch;
	let newKey;
	let resultObject={};
	if(insideJsonFile){
		
		const arrayOfObjects = Object.entries(insideJsonFile).map(([key, obj]) => ({ [key]: obj }));
		const existObject = arrayOfObjects.find(obj => {
		  const key = Object.keys(obj)[0];
		  return obj[key].name === name;
		});
		
		
		if(existObject){
			hasName = true;
			const targetKey = Object.keys(existObject)[0];
			if(sid === undefined){
				newKey = generateSessionToken();
				editKeyInJson(newKey,targetKey);
			}else{
				if(targetKey === sid){
			 		sidMatch = true;
			 	}else{
			 		sidMatch = false;
			 		resultObject['hasName'] = hasName;
				 	resultObject['sidMatch'] = sidMatch;
				 	resultObject['newKey'] = newKey;
				 	return resultObject;
			 	}
			}
		}else{
			hasName = false;
			const existID = arrayOfObjects.find(item => Object.keys(item)[0] === sid);
			if(existID){
				const existedName = existID[sid].name;
			  resultObject['existedName'] = existedName;
			}
			
		}
		
	 	resultObject['hasName'] = hasName;
	 	resultObject['sidMatch'] = sidMatch;
	 	resultObject['newKey'] = newKey;
	 	return resultObject;
	}else{
		resultObject['hasName'] = false;
	 	resultObject['sidMatch'] = false;
	 	resultObject['newKey'] = newKey;
	 	return resultObject;
	}
}

const addUserToJSON=(sessIDData)=> {
  try {
  	// Read the existing content of the file (if any)
    const data = fs.readFileSync('sid.json', 'utf8');
    let existingData = {};
    existingData = JSON.parse(data);

    // Merge the existing data with the new data
	  const updatedData = { ...existingData, ...sessIDData };

	  // Convert the updated data back to a JSON string with indentation
	  const updatedDataString = JSON.stringify(updatedData, null, 2);

    fs.writeFileSync('sid.json', updatedDataString, 'utf8');
    console.log('addUserToJSON function: JSON file updated successfully');
    
  } catch (error) {
    console.error('addUserToJSON function: Error reading or writing the file:', error);
  }
}

const editStatusInJson=(sid,log)=>{
	try {
    const data = fs.readFileSync('sid.json', 'utf8');
    const jsonObject = JSON.parse(data);

    if (sid in jsonObject) {
    	if(log){
    		jsonObject[sid].status = true;
    	}else{
    		jsonObject[sid].status = false;
    	}
      
      const updatedJsonData = JSON.stringify(jsonObject, null, 2);

      fs.writeFileSync('sid.json', updatedJsonData, 'utf8');
      return true;
    } else {
      console.error('editStatusInJson function: Change status in JSON file failed! The old key does not exist in the JSON file.');
      return false;
    }

  } catch (error) {
    console.error('editStatusInJson function: Change status in JSON file failed! Error reading or writing the file:', error);
    return false;
  }
}

const editKeyInJson = (newKey, oldKey) => {
  try {
    const data = fs.readFileSync('sid.json', 'utf8');
    const jsonObject = JSON.parse(data);

    if (oldKey in jsonObject) {
      jsonObject[newKey] = jsonObject[oldKey];
      delete jsonObject[oldKey];

      const updatedJsonData = JSON.stringify(jsonObject, null, 2);

      fs.writeFileSync('sid.json', updatedJsonData, 'utf8');
      console.log('editKeyInJson function: JSON file updated successfully');
    } else {
      console.error('editKeyInJson function: The old key does not exist in the JSON data');
    }
  } catch (error) {
    console.error('editKeyInJson function: Error reading or writing the file:', error);
  }
};

//specifying the content type of the file to be sent to client
const contentSpecifier=(extension)=>{ 
	switch (extension) {
	case '.html':
		return 'text/html';
		break;
	case '.css':
		return 'text/css';
		break;
	case '.js':
		return 'text/javascript';
		break;
	case '.map':
		return 'application/json';
		break;
	case '.jpg': 
		return 'image/jpg';
		break;
	case '.jpeg':
		return 'image/jpg';
		break; 
	case '.gif':
		return 'image/gif';
		break; 
	case '.png':
		return 'image/png';
		break; 
	case '.woff':
		return 'font/woff';
		break; 
	case '.eot':
		return 'application/vnd.ms-fontobject';
		break;
	case '.svg':
		return 'image/svg+xml';
		break;
	case '.ttf':
		return 'font/ttf';
		break;
	case '.otf':
		return 'font/otf';
		break;
	}
}

module.exports = {
	parseCookies,
	generateSessionToken,
	addUserToJSON,
	loadsessIDFromJSON,
	serverResponseHeader,
	checkNameIfExist,
	contentSpecifier,
	getUserName,
	editKeyInJson,
	getAllUserName,
	checkUserStatus,
	editStatusInJson,
	sessionedUser,
	webSocketConnections
}