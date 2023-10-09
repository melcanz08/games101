const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const WebSocket = require('ws');


let clients = {};

const webSocketConnections=(server)=>{
	
	// Create a WebSocket server instance
	const wss = new WebSocket.WebSocketServer({ server });
	//const wss = new WebSocket.Server({ port: wsPort});
	// Handle incoming websocket connections
	wss.on('connection', (conn, req) => {
		console.log('New client connected on the websocket server');

		console.log('req.headers.cookie: ',req.headers.cookie);
		const cookies = parseCookies(req.headers.cookie);
		let sid;
		if(cookies){
			sid = cookies.sessidrps;
		}
		

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
			
			if(data.type ==='checkName'){
				console.log('data.uid: ',data.uid);
				console.log('sid: ',sid);
				let accountInfo = checkAccountExistence(data.name,sid,data.uid);
				
				responseObject.accountInfo = accountInfo;
				console.log('responseObject: ',responseObject);
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
				let userName = getUserName(data.playersID);
				setTimeout(()=>{
					Object.keys(clients).forEach((clientID)=>{
						if(clientID !== data.playersID){
							clients[clientID].send(JSON.stringify({ type: 'displayOtherUsers', userKey: data.playersID, playerName: userName}));
						}
					});

				},5000);	
			}

			if(data.type === 'playerNotReady'){
				
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
		  	const defenderSocket = clients[data.defenderID];
	      if (defenderSocket) {
	        defenderSocket.send(JSON.stringify({ type: 'challenge_declined'}));
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

const checkUserStatus=(sid)=>{
	let insideSidJson = loadsessIDFromJSON();
	if(sid){
		let foundSid = Object.entries(insideSidJson).find((elem)=>{
			return elem[0] === sid;
		});
		if(foundSid){
			let foundObj = foundSid[1];
			console.log('foundObj: ',foundObj);
			if(foundObj.status === true){
				return true;
			}else{
				return false;
			}
		}else{return false;}
	}else{
		return false;
	}
}

const getUserId=(sid)=>{
	let insideSidJson = loadsessIDFromJSON();
	const arr = Object.entries(insideSidJson);
	const uid = arr.find(([key, value]) => key === sid)[1].userID;
	return uid;
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

const sessionedUser=(res,sid)=>{
	const readStream = fs.createReadStream(`${__dirname}/misc/ejs/main.ejs`, 'utf8');
	let userid = getUserId(sid);
	let userName = getUserName(sid);
	let activeUser = getAllUserActive(sid);
	let htmlData = '';

  readStream.on('data', (chunk) => {
    htmlData += chunk;
   
  });

  readStream.on('end', () => {
		const renderedHtmlData = ejs.render(htmlData, {
			currentUsersId: sid,
			userName: userName,
			activeUser: activeUser,
			userid: userid
    });
    
    // Send the rendered html string
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderedHtmlData);
  });

  readStream.on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  });
}

const registerUser=(res,sid,name)=>{
	const readStream = fs.createReadStream(`${__dirname}/misc/ejs/main.ejs`, 'utf8');

	let userName = name;
	let activeUser = getAllUserActive(sid);
	let htmlData = '';

  readStream.on('data', (chunk) => {
    htmlData += chunk;
   
  });

  readStream.on('end', () => {
  	
		const renderedHtmlData = ejs.render(htmlData, {
			currentUsersId: sid,
			userName: userName,
			activeUser: activeUser
    });
    
    // Send the rendered html string
		const oneYearFromNow = new Date();
		oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
	  res.setHeader('Set-Cookie', `sessidrps=${sid};Expires=${oneYearFromNow.toUTCString()};SameSite=none;secure;HttpOnly;Path=/`);
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

const parseCookies=(cookieHeader)=>{
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
    	if(cookie.indexOf('sessidrps') !== -1){
    		const parts = cookie.split('=');
      	cookies[parts[0].trim()] = parts[1].trim();
      }  
    });
    return cookies;
  }
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

const checkName = ()=>{
	let insideJsonFile=loadsessIDFromJSON();

	let resultObj = {};

	for (const key in insideJsonFile) {
		if(insideJsonFile[key].name === "rommel08"){
			resultObj[key] = insideJsonFile[key];
		}
	}

	console.log("foundName: ",resultObj);

	/*let arrOfobj = Object.values(insideJsonFile);
	let foundName = arrOfobj.find((elem)=>{
		return elem.name === "rommel08";
	});

	if(foundName){
		console.log("foundName: ",foundName);
	}else{
		console.log("foundName: ",foundName);
	}*/
}

const checkAccountExistence = (name,sid,userid)=>{
	console.log('name: ', name);
  	console.log('sid: ', sid);
  	console.log('userid: ', userid);
	let hasName = false;
	let sidMatch = false;
	let idMatch = false;
	let newKey;
	let resultObject={};

  function initResult(name,cookie,id,userName){
  	if(userName){
  		resultObject.userName = userName;
  	}
  	resultObject.hasName = name;
		resultObject.sidMatch = cookie;
		resultObject.idMatch = id;
  }
	
	let insideJsonFile=loadsessIDFromJSON();
	console.log('checkAccountExistence: ',insideJsonFile);
	let resultNames = {};
	for (let key in insideJsonFile) {
		if(insideJsonFile[key].name === name){
			resultNames[key] = insideJsonFile[key];
		}
	}
	
	console.log('resultNames: ',resultNames);
	// IF NAME FOUND
	if(Object.keys(resultNames).length > 0){
		hasName = true;
		// INITILIZE PROPERTY NAME AND VALUE OF THE OUTPUT RESULT OBJECT 
		
		let sidFound = {};
		sidFoundLoop: for(let key in resultNames){
			if (key === sid){
				sidFound[key] = resultNames[key];
				break sidFoundLoop;
			} 
		}
		console.log('sidFound: ',sidFound);
		// IF COOKIE FOUND
		if(Object.keys(sidFound).length > 0){
			sidMatch = true;
			let key = Object.keys(sidFound)[0];
			// IF ID FOUND
			if(sidFound[key].userID === userid){
				editStatusInJson(sid,true);
				console.log('key: ',key);
				idMatch = true;
				// hasName = true, sidmatch = true, idMatch = true
				initResult(hasName,sidMatch,idMatch);
		 		return resultObject;
			}
		// IF COOKIE NOT FOUND 
		}else{
			hasName = true;
			sidMatch = false;
			let idFound = {};
			idFoundLoop: for(let key in resultNames){
				if (resultNames[key].userID === userid){
					idFound[key] = resultNames[key];
					break idFoundLoop;
				} 
			}
			// IF ID FOUND
			if(Object.keys(idFound).length > 0){
				idMatch = true;
				resultObject.idMatch = idMatch;
				const targetKey = Object.keys(idFound)[0];
				newKey = generateSessionToken();
				editKeyInJson(newKey,targetKey);
				resultObject.newKey = newKey;
				// hasName = true, sidmatch = false, idMatch = true
				initResult(hasName,sidMatch,idMatch);
		 		return resultObject;
			}else{
				idMatch = false;
				// hasName = true, sidmatch = false, idMatch = false
				initResult(hasName,sidMatch,idMatch,name);
		 		return resultObject;
			}
		}	
	// IF NAME NOT FOUND	
	}else{
		hasName = false;
		let foundSid = {};
		noNameFoundLoop: for (let key in insideJsonFile) {
			if(key === sid){
				foundSid[key] = insideJsonFile[key];
				break noNameFoundLoop;
			}
		}
		
		// IF COOKIE FOUND 
		if(Object.keys(foundSid).length > 0){
			sidMatch = true;
			// IF ID FOUND
			console.log('foundSid[sid].userID: ',foundSid[sid].userID);
			console.log('userid: ',userid);
			if(foundSid[sid].userID === userid){
				idMatch = true;
				let userName = foundSid[sid].name;
				initResult(hasName,sidMatch,idMatch,userName);
				// hasName = false, sidmatch = true, idMatch = true
				return resultObject;
			}
		// IF COOKIE NOT FOUND 
		}else{
			let onlyId={};
			onlyIdLoop: for (let key in insideJsonFile) {
				if(insideJsonFile[key].userID === userid){
					onlyId[key] = insideJsonFile[key];
					break onlyIdLoop;				}
			}
			if(Object.keys(onlyId).length > 0){
				idMatch=true;
				sidmatch = false;
				let id = Object.keys(onlyId)[0];
				let userName = onlyId[id].name;
				// hasName = false, sidmatch = false, idMatch = true
				initResult(hasName,sidMatch,idMatch,userName);
				return resultObject;
			}else{
				idMatch=false;
				sidMatch = false;
				// hasName = false, sidmatch = false, idMatch = false
				initResult(hasName,sidMatch,idMatch);
				return resultObject;
			}
		}
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
   let insideJsonFile=loadsessIDFromJSON();
  console.log('insideJsonFile: ',insideJsonFile);

    if (insideJsonFile.hasOwnProperty(sid) ){
    	if(log){
    		insideJsonFile[sid].status = true;
    	}else{
    		insideJsonFile[sid].status = false;
		 console.log('insideJsonFile[sid].status: ',insideJsonFile[sid].status);
    	}
      
      const updatedJsonData = JSON.stringify(insideJsonFile, null, 2);

      fs.writeFileSync('sid.json', updatedJsonData, 'utf8');
	    console.log('insideJsonFile: ',loadsessIDFromJSON());
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
	checkAccountExistence,
	contentSpecifier,
	getUserName,
	editKeyInJson,
	getAllUserName,
	checkUserStatus,
	editStatusInJson,
	sessionedUser,
	webSocketConnections,
	checkName,
	registerUser,
	getUserId
}